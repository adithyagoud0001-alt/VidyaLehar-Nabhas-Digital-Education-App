import { supabase } from './supabaseClient';
import { db } from './db';
import type { Course, Lesson, StudentProgress } from '../types';

// Fetches all data from Supabase and populates the local IndexedDB.
export const syncDown = async () => {
  console.log('Syncing data down from Supabase...');
  try {
    // 1. Fetch all public data
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

    const allCourses = coursesRes.data;
    const allLessons = lessonsRes.data;
    // Fix: Cast the fetched student progress data. The Supabase client now sees the
    // `courseProgress` and `scoreHistory` columns as generic `Json` to fix type
    // inference. We cast it back to the specific client-side `StudentProgress` type
    // before storing it in the local database.
    const allProgress = studentProgressRes.data as unknown as StudentProgress[];
    const allProfiles = profilesRes.data;

    // 2. Reconstruct course objects with nested lessons
    // Fix: Add checks for null data to prevent runtime errors and satisfy TypeScript.
    const coursesWithLessons = allCourses?.map(course => ({
      ...course,
      lessons: allLessons?.filter(lesson => lesson.course_id === course.id).map(({ course_id, ...rest }) => rest) as Lesson[]
    })) || [];

    // 3. Use a transaction to bulk-upsert the new data
    // Fix: Removed .clear() calls. This makes the sync non-destructive.
    // bulkPut will now act as an "upsert", updating existing records and adding new ones
    // without deleting local-only records (like a newly created course not yet on the server).
    await db.transaction('rw', db.courses, db.studentProgress, db.profiles, async () => {
        await db.courses.bulkPut(coursesWithLessons);
        await db.studentProgress.bulkPut(allProgress);
        await db.profiles.bulkPut(allProfiles || []);
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
                    const { error: progressError } = await supabase.from('student_progress').upsert(action.payload);
                    error = progressError;
                    break;
                case 'SAVE_COURSE':
                    // The local Course object contains a 'lessons' array, which is not a column
                    // in the Supabase 'courses' table. We must remove it before upserting.
                    const { lessons, ...courseToSave } = action.payload;
                    const { error: courseError } = await supabase.from('courses').upsert(courseToSave);
                    error = courseError;
                    break;
                case 'SAVE_LESSON':
                    // The local Lesson object contains a client-side 'hasOfflineVideo' flag
                    // which is not a column in the Supabase 'lessons' table. Remove it before upserting.
                    const { hasOfflineVideo, ...lessonToSave } = action.payload;
                    const { error: lessonError } = await supabase.from('lessons').upsert(lessonToSave);
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

            // If successful, remove from queue
            await db.syncQueue.delete(action.id!);
            console.log(`Successfully processed action ID: ${action.id}`);
        } catch (error) {
            // Fix: Improved error logging to provide a clear message instead of '[object Object]'.
            // This will expose the actual reason for the sync failure from Supabase.
            const err = error as any;
            console.error(`Failed to process sync action ID: ${action.id}, type: ${action.type}.`);
            if (err.message) {
                console.error(`Error: ${err.message}`);
            }
            if (err.details) {
                console.error(`Details: ${err.details}`);
            }
            if(err.hint) {
                console.error(`Hint: ${err.hint}`);
            }
        }
    }
};