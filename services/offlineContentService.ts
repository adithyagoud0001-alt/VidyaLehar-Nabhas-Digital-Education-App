import type { Course, Lesson, StudentProgress, SearchResult } from '../types';
import { db } from './db';
// Fix: Removed incorrect import of video helper functions which are defined locally in this file.

// --- IndexedDB Video Service Logic (now using Dexie) ---

const saveVideo = async (lessonId: string, videoBlob: Blob): Promise<void> => {
  await db.videos.put({ id: lessonId, blob: videoBlob });
};

export const getVideo = async (lessonId: string): Promise<Blob | undefined> => {
  const videoObject = await db.videos.get(lessonId);
  return videoObject?.blob;
};

const deleteVideo = async (lessonId: string): Promise<void> => {
  return await db.videos.delete(lessonId);
};

// --- Content Service Logic (reading from/writing to local DB) ---

// --- Data Fetching Functions (from Dexie) ---
export const getCourses = (): Promise<Course[]> => {
  return db.courses.toArray();
};

export const getCoursesForClass = (classNumber: number): Promise<Course[]> => {
  return db.courses.where({ forClass: classNumber }).toArray();
};

export const getCoursesByAuthor = (authorId: string): Promise<Course[]> => {
  return db.courses.where({ authorId }).toArray();
};

export const getStudentProgress = (): Promise<StudentProgress[]> => {
  return db.studentProgress.toArray();
};

// --- Download Management (Still uses localStorage for simplicity, but video is in IDB) ---
const DOWNLOADED_LESSONS_KEY = 'vidyalehar_downloaded_lessons';
export const getDownloadedLessons = (): string[] => {
    const data = localStorage.getItem(DOWNLOADED_LESSONS_KEY);
    return data ? JSON.parse(data) : [];
};
export const isLessonDownloaded = (lessonId: string): boolean => {
    return getDownloadedLessons().includes(lessonId);
};

// --- Data Update Functions (writing to Dexie & queuing sync) ---

export const saveCourse = async (courseData: Omit<Course, 'id' | 'lessons' | 'authorId'> & { id?: string }, authorId: string): Promise<Course> => {
    let courseToSave: Course;
    const isUpdate = !!courseData.id;

    if (isUpdate) {
        const existingCourse = await db.courses.get(courseData.id!);
        if (!existingCourse) throw new Error("Course not found for updating");
        courseToSave = { ...existingCourse, ...courseData };
    } else {
        courseToSave = {
            ...courseData,
            id: `course_${Date.now()}`,
            lessons: [],
            authorId: authorId
        };
    }
    
    await db.courses.put(courseToSave);
    await db.syncQueue.add({ type: 'SAVE_COURSE', payload: courseToSave, timestamp: Date.now() });
    
    return courseToSave;
};

export const deleteCourse = async (courseId: string): Promise<void> => {
    const courseToDelete = await db.courses.get(courseId);
    if (courseToDelete) {
        // --- Sync Queueing ---
        // 1. Queue deletion for all associated lessons
        for (const lesson of courseToDelete.lessons) {
            await db.syncQueue.add({ type: 'DELETE_LESSON', payload: { id: lesson.id }, timestamp: Date.now() });
        }
        // 2. Queue remote deletion for the course itself
        await db.syncQueue.add({ type: 'DELETE_COURSE', payload: { id: courseId }, timestamp: Date.now() });

        // --- Local Deletion ---
        // 3. Delete the course locally (lessons are embedded, so they go too)
        await db.courses.delete(courseId);

        // --- Clean up associated student progress ---
        // 4. Find all student progress records and update them
        const allProgress = await db.studentProgress.toArray();
        for (const studentProgress of allProgress) {
            const progressIndex = studentProgress.courseProgress.findIndex(cp => cp.courseId === courseId);
            
            // If the student had progress in this course, remove it
            if (progressIndex > -1) {
                studentProgress.courseProgress.splice(progressIndex, 1);
                
                // Recalculate overall score history for today
                const allCourseScores = studentProgress.courseProgress.map(cp => cp.score).filter(s => s > 0);
                const overallAverage = allCourseScores.length > 0 ? allCourseScores.reduce((sum, s) => sum + s, 0) / allCourseScores.length : 0;
                const today = new Date().toISOString().split('T')[0];
                const todayHistory = studentProgress.scoreHistory.find(h => h.date === today);

                if (todayHistory) {
                    todayHistory.score = overallAverage;
                }
                
                // 5. Update local DB for the student
                await db.studentProgress.put(studentProgress);
                
                // 6. Queue the updated progress for sync
                await db.syncQueue.add({ type: 'UPDATE_PROGRESS', payload: studentProgress, timestamp: Date.now() });
            }
        }
    }
};

export const saveLesson = async (
    courseId: string,
    lessonData: Omit<Lesson, 'id'> & { id?: string },
    videoFileAction?: File | null
): Promise<Lesson> => {
    const course = await db.courses.get(courseId);
    if (!course) throw new Error("Course not found");

    const isUpdate = !!lessonData.id;
    const lessonId = lessonData.id || `lesson_${Date.now()}`;
    const oldLesson = isUpdate ? course.lessons.find(l => l.id === lessonId) : undefined;

    if (videoFileAction instanceof File) {
        await saveVideo(lessonId, videoFileAction);
    } else if (videoFileAction === null) {
        if (oldLesson?.hasOfflineVideo) await deleteVideo(lessonId);
    } else if (lessonData.videoUrl && oldLesson?.hasOfflineVideo) {
        await deleteVideo(lessonId);
    }

    const finalLessonData: Lesson = {
        ...lessonData,
        id: lessonId,
        quiz: lessonData.quiz || [],
    };
    
    if (isUpdate) {
        const lessonIndex = course.lessons.findIndex(l => l.id === lessonId);
        if (lessonIndex > -1) course.lessons[lessonIndex] = finalLessonData;
    } else {
        course.lessons.push(finalLessonData);
    }

    await db.courses.put(course);
    // Queue lesson sync (flat structure for Supabase)
    await db.syncQueue.add({ type: 'SAVE_LESSON', payload: { ...finalLessonData, course_id: courseId }, timestamp: Date.now() });
    
    // --- Update totalLessons count for all students with progress in this course ---
    // This is especially important for newly added lessons.
    if (!isUpdate) { // Only run for new lessons to avoid unnecessary writes on edits
        const allProgress = await db.studentProgress.toArray();
        for (const studentProgress of allProgress) {
            const courseProgress = studentProgress.courseProgress.find(cp => cp.courseId === courseId);
            if (courseProgress) {
                courseProgress.totalLessons = course.lessons.length;
                await db.studentProgress.put(studentProgress);
                await db.syncQueue.add({ type: 'UPDATE_PROGRESS', payload: studentProgress, timestamp: Date.now() });
            }
        }
    }

    return finalLessonData;
};

export const deleteLesson = async (courseId: string, lessonId: string): Promise<void> => {
    const course = await db.courses.get(courseId);
    if (course) {
        const lessonToDelete = course.lessons.find(l => l.id === lessonId);
        if (lessonToDelete?.hasOfflineVideo) {
            await deleteVideo(lessonId).catch(err => console.error(`Failed to delete video for lesson ${lessonId}:`, err));
        }
        
        // Update course object locally
        const originalLessonCount = course.lessons.length;
        course.lessons = course.lessons.filter(l => l.id !== lessonId);
        
        // Only proceed if a lesson was actually deleted
        if (course.lessons.length < originalLessonCount) {
            await db.courses.put(course);
            // Queue remote deletion
            await db.syncQueue.add({ type: 'DELETE_LESSON', payload: { id: lessonId }, timestamp: Date.now() });

            // --- Clean up associated student progress ---
            const allProgress = await db.studentProgress.toArray();
            for (const studentProgress of allProgress) {
                const courseProgress = studentProgress.courseProgress.find(cp => cp.courseId === courseId);
                
                if (courseProgress) {
                    let progressNeedsUpdate = false;
                    const lessonStatusIndex = courseProgress.lessonStatus.findIndex(ls => ls.lessonId === lessonId);
                    
                    if (lessonStatusIndex > -1) {
                        courseProgress.lessonStatus.splice(lessonStatusIndex, 1);
                        
                        // Recalculate course-specific progress
                        const completedLessonsWithScore = courseProgress.lessonStatus.filter(ls => ls.finalScore > 0);
                        courseProgress.completedLessons = completedLessonsWithScore.length;
                        const totalScore = completedLessonsWithScore.reduce((sum, ls) => sum + ls.finalScore, 0);
                        courseProgress.score = completedLessonsWithScore.length > 0 ? totalScore / completedLessonsWithScore.length : 0;
                        
                        // Recalculate overall score history for today
                        const allCourseScores = studentProgress.courseProgress.map(cp => cp.score).filter(s => s > 0);
                        const overallAverage = allCourseScores.length > 0 ? allCourseScores.reduce((sum, s) => sum + s, 0) / allCourseScores.length : 0;
                        const today = new Date().toISOString().split('T')[0];
                        const todayHistory = studentProgress.scoreHistory.find(h => h.date === today);
                        if (todayHistory) {
                            todayHistory.score = overallAverage;
                        }
                        progressNeedsUpdate = true;
                    }
                    
                    if (courseProgress.totalLessons !== course.lessons.length) {
                        courseProgress.totalLessons = course.lessons.length;
                        progressNeedsUpdate = true;
                    }

                    if (progressNeedsUpdate) {
                        await db.studentProgress.put(studentProgress);
                        await db.syncQueue.add({ type: 'UPDATE_PROGRESS', payload: studentProgress, timestamp: Date.now() });
                    }
                }
            }
        }
    }
};

export const downloadLesson = async (lesson: Lesson): Promise<void> => {
    if (!lesson.videoUrl || isLessonDownloaded(lesson.id)) return;

    try {
        const response = await fetch(lesson.videoUrl);
        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        const videoBlob = await response.blob();
        await saveVideo(lesson.id, videoBlob);
        
        const downloaded = getDownloadedLessons();
        downloaded.push(lesson.id);
        localStorage.setItem(DOWNLOADED_LESSONS_KEY, JSON.stringify(downloaded));
    } catch (error) {
        console.error("Failed to download lesson:", error);
        await deleteVideo(lesson.id).catch(e => console.error("Cleanup failed:", e));
        throw error;
    }
};

export const removeDownloadedLesson = async (lessonId: string): Promise<void> => {
    try {
        await deleteVideo(lessonId);
        let downloaded = getDownloadedLessons();
        downloaded = downloaded.filter(id => id !== lessonId);
        localStorage.setItem(DOWNLOADED_LESSONS_KEY, JSON.stringify(downloaded));
    } catch (error) {
        console.error("Failed to remove downloaded lesson:", error);
        throw error;
    }
};

export const updateQuizProgress = async (studentId: string, studentName: string, courseId: string, lessonId: string, score: number) => {
    let studentProgress = await db.studentProgress.get(studentId);
    if (!studentProgress) {
        studentProgress = { studentId, studentName, courseProgress: [], scoreHistory: [] };
    }

    let courseProgress = studentProgress.courseProgress.find(cp => cp.courseId === courseId);
    const course = await db.courses.get(courseId);

    if (!courseProgress) {
        courseProgress = { courseId, completedLessons: 0, totalLessons: course?.lessons.length || 0, score: 0, lessonStatus: [] };
        studentProgress.courseProgress.push(courseProgress);
    }

    let lessonStatus = courseProgress.lessonStatus.find(ls => ls.lessonId === lessonId);
    if (!lessonStatus) {
        lessonStatus = { lessonId, attempts: 1, finalScore: score };
        courseProgress.lessonStatus.push(lessonStatus);
    } else {
        lessonStatus.attempts += 1;
        lessonStatus.finalScore = Math.max(lessonStatus.finalScore, score);
    }

    const completedLessonsWithScore = courseProgress.lessonStatus.filter(ls => ls.finalScore > 0);
    courseProgress.completedLessons = completedLessonsWithScore.length;
    const totalScore = completedLessonsWithScore.reduce((sum, ls) => sum + ls.finalScore, 0);
    courseProgress.score = completedLessonsWithScore.length > 0 ? totalScore / completedLessonsWithScore.length : 0;
    
    const allCourseScores = studentProgress.courseProgress.map(cp => cp.score).filter(s => s > 0);
    const overallAverage = allCourseScores.length > 0 ? allCourseScores.reduce((sum, s) => sum + s, 0) / allCourseScores.length : 0;
    const today = new Date().toISOString().split('T')[0];
    const todayHistory = studentProgress.scoreHistory.find(h => h.date === today);
    if (todayHistory) {
        todayHistory.score = overallAverage;
    } else {
        studentProgress.scoreHistory.push({ date: today, score: overallAverage });
    }

    // Update local DB and queue sync
    await db.studentProgress.put(studentProgress);
    await db.syncQueue.add({ type: 'UPDATE_PROGRESS', payload: studentProgress, timestamp: Date.now() });
};

// --- Search Functionality (from Dexie) ---
export const searchContent = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.trim().length < 2) return [];

  const lowerCaseQuery = query.toLowerCase();
  const courses = await db.courses.toArray();
  const results: SearchResult[] = [];

  courses.forEach(course => {
    if (course.title.toLowerCase().includes(lowerCaseQuery) || course.description.toLowerCase().includes(lowerCaseQuery)) {
      results.push({ type: 'course', course: course, title: course.title, context: 'Course' });
    }

    course.lessons.forEach(lesson => {
      const strippedContent = lesson.content.replace(/<[^>]+>/g, '');
      if (lesson.title.toLowerCase().includes(lowerCaseQuery) || strippedContent.toLowerCase().includes(lowerCaseQuery)) {
        results.push({ type: 'lesson', course: course, lesson: lesson, title: lesson.title, context: `In course: ${course.title}`});
      }
    });
  });
  
  return results.slice(0, 10);
};