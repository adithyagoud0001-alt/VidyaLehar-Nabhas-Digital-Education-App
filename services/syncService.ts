import { supabase } from './supabaseClient';
import { db } from './db';
import type { Course, Lesson, StudentProgress, QuizQuestion, TranscriptEntry } from '../types';

// Fetches all data from Supabase and populates the local IndexedDB.
export const syncDown = async () => {
  console.log('Syncing data down from Supabase...');
  try {
    const [coursesRes, lessonsRes, studentProgressRes, profilesRes] = await Promise.all([
      supabase.from('courses').select('*'),
      supabase.from('lessons').select('*'),
      supabase.from('student_progress').select('*'),
      supabase.from('profiles').select('*')
    ]);

    if (coursesRes.error) throw coursesRes.error;
    if (lessonsRes.error) throw lessonsRes.error;
    if (studentProgressRes.error) throw studentProgressRes.error;
    if (profilesRes.error) throw profilesRes.error;

    const allCoursesSnake = coursesRes.data || [];
    const allLessonsSnake = lessonsRes.data || [];
    const allRawProgressSnake = studentProgressRes.data || [];
    const allProfiles = profilesRes.data || [];

    const allProgress: StudentProgress[] = allRawProgressSnake.map(p => ({
        studentId: p.student_id,
        studentName: p.student_name,
        courseProgress: (p.course_progress as any) || [],
        scoreHistory: (p.score_history as any) || [],
    }));

    const localCourseIds = await db.courses.toCollection().keys() as string[];
    const localProgressIds = await db.studentProgress.toCollection().keys() as string[];
    const localProfileIds = await db.profiles.toCollection().keys() as string[];
    
    const serverCourseIds = new Set(allCoursesSnake.map(c => c.id));
    const serverProgressIds = new Set(allProgress.map(p => p.studentId));
    const serverProfileIds = new Set(allProfiles.map(p => p.id));

    const pendingCreations = await db.syncQueue.where('type').equals('SAVE_COURSE').toArray();
    const pendingCreationIds = new Set(pendingCreations.map(item => item.payload.id));
    
    const coursesToDelete = localCourseIds.filter(id => !serverCourseIds.has(id) && !pendingCreationIds.has(id));
    const progressToDelete = localProgressIds.filter(id => !serverProgressIds.has(id));
    const profilesToDelete = localProfileIds.filter(id => !serverProfileIds.has(id));

    const coursesWithLessons: Course[] = allCoursesSnake.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      icon: course.icon as 'Book' | 'Computer' | 'Calculator',
      authorId: course.author_id,
      forClass: course.for_class,
      lessons: allLessonsSnake
        .filter(lesson => lesson.course_id === course.id)
        .map(lesson => ({
          id: lesson.id,
          title: lesson.title,
          content: lesson.content,
          summary: lesson.summary || undefined,
          videoUrl: lesson.video_url || undefined,
          hasOfflineVideo: false,
          transcript: lesson.transcript as TranscriptEntry[] | undefined,
          quiz: lesson.quiz as QuizQuestion[],
          difficulty: (lesson.difficulty as 'Easy' | 'Medium' | 'Hard') || undefined,
        } as Lesson))
    }));

    await db.transaction('rw', db.courses, db.studentProgress, db.profiles, async () => {
      if (coursesToDelete.length > 0) await db.courses.bulkDelete(coursesToDelete);
      if (progressToDelete.length > 0) await db.studentProgress.bulkDelete(progressToDelete);
      if (profilesToDelete.length > 0) await db.profiles.bulkDelete(profilesToDelete);

      await db.courses.bulkPut(coursesWithLessons);
      await db.studentProgress.bulkPut(allProgress);
      await db.profiles.bulkPut(allProfiles);
    });

    console.log('Sync down completed successfully.');
  } catch (error) {
    console.error('Error during sync down:', error);
  }
};

// Processes the sync queue to push offline changes to Supabase.
export const processSyncQueue = async () => {
    const offlineActions = await db.syncQueue.orderBy('timestamp').toArray();
    if (offlineActions.length === 0) {
        console.log('Sync queue is empty.');
        return;
    }

    console.log(`Processing ${offlineActions.length} items from sync queue.`);

    for (const action of offlineActions) {
        try {
            let error = null;
            switch (action.type) {
                case 'UPDATE_PROGRESS':
                    const { studentId, studentName, courseProgress, scoreHistory } = action.payload;
                    const { error: progressError } = await supabase.from('student_progress').upsert({
                        student_id: studentId,
                        student_name: studentName,
                        course_progress: courseProgress,
                        score_history: scoreHistory,
                    });
                    error = progressError;
                    break;
                case 'SAVE_COURSE':
                    const course = action.payload;
                    const { error: courseError } = await supabase.from('courses').upsert({
                        id: course.id,
                        title: course.title,
                        description: course.description,
                        icon: course.icon,
                        author_id: course.authorId,
                        for_class: course.forClass,
                    });
                    error = courseError;
                    break;
                case 'SAVE_LESSON':
                    const lesson = action.payload;
                    const { error: lessonError } = await supabase.from('lessons').upsert({
                        id: lesson.id,
                        course_id: lesson.course_id,
                        title: lesson.title,
                        content: lesson.content,
                        summary: lesson.summary,
                        video_url: lesson.videoUrl,
                        difficulty: lesson.difficulty,
                        quiz: lesson.quiz,
                        transcript: lesson.transcript,
                    });
                    error = lessonError;
                    break;
                 case 'DELETE_COURSE':
                    const { error: deleteCourseError } = await supabase.from('courses').delete().match({ id: action.payload.id });
                    error = deleteCourseError;
                    break;
                 case 'DELETE_LESSON':
                    const { error: deleteLessonError } = await supabase.from('lessons').delete().match({ id: action.payload.id });
                    error = deleteLessonError;
                    break;
            }

            if (error) {
                throw error;
            }
            await db.syncQueue.delete(action.id!);
            console.log(`Successfully processed action ID: ${action.id}, type: ${action.type}.`);
        } catch (error: any) {
            console.error(`Failed to process sync action ID: ${action.id}, type: ${action.type}.`);
            console.error(`Error: ${error.message}`);
        }
    }
};