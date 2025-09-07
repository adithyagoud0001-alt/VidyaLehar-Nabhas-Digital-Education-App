import type { Course, Lesson, StudentProgress } from '../types';


// --- IndexedDB Service Logic ---
const DB_NAME = 'vidyaleharDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject('Error opening IndexedDB.');
    };
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
  return dbPromise;
};

const saveVideo = async (lessonId: string, videoBlob: Blob): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(videoBlob, lessonId);
    request.onsuccess = () => resolve();
    request.onerror = () => {
        console.error('Error saving video to IndexedDB:', request.error);
        reject('Failed to save video.');
    };
  });
};

export const getVideo = async (lessonId: string): Promise<Blob | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(lessonId);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => {
        console.error('Error getting video from IndexedDB:', request.error);
        reject('Failed to retrieve video.');
    };
  });
};

const deleteVideo = async (lessonId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(lessonId);
    request.onsuccess = () => resolve();
    request.onerror = () => {
        console.error('Error deleting video from IndexedDB:', request.error);
        reject('Failed to delete video.');
    };
  });
};


// --- Content Service Logic ---
const COURSES_KEY = 'vidyalehar_courses';
const PROGRESS_KEY = 'vidyalehar_progress';
const DOWNLOADED_LESSONS_KEY = 'vidyalehar_downloaded_lessons';


// Mock Data for initial setup
const initialCourses: Course[] = [];

export const initializeData = () => {
  if (!localStorage.getItem(COURSES_KEY)) {
    localStorage.setItem(COURSES_KEY, JSON.stringify(initialCourses));
  }
};

// --- Data Fetching Functions ---
export const getCourses = (): Course[] => {
  const data = localStorage.getItem(COURSES_KEY);
  return data ? JSON.parse(data) : [];
};

export const getCoursesForClass = (classNumber: number): Course[] => {
  const allCourses = getCourses();
  return allCourses.filter(course => course.forClass === classNumber);
};

export const getCoursesByAuthor = (authorId: string): Course[] => {
  const allCourses = getCourses();
  return allCourses.filter(course => course.authorId === authorId);
};

export const getStudentProgress = (): StudentProgress[] => {
  const data = localStorage.getItem(PROGRESS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getDownloadedLessons = (): string[] => {
    const data = localStorage.getItem(DOWNLOADED_LESSONS_KEY);
    return data ? JSON.parse(data) : [];
};

export const isLessonDownloaded = (lessonId: string): boolean => {
    return getDownloadedLessons().includes(lessonId);
};


// --- Data Update Functions ---

export const saveCourse = (courseData: Omit<Course, 'id' | 'lessons' | 'authorId'> & { id?: string }, authorId: string): Course => {
    const courses = getCourses();
    if (courseData.id) { // Update
        const courseIndex = courses.findIndex(c => c.id === courseData.id);
        if (courseIndex > -1) {
            courses[courseIndex] = { ...courses[courseIndex], ...courseData };
            localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
            return courses[courseIndex];
        }
        throw new Error("Course not found for updating");
    } else { // Create
        if (!courseData.forClass) {
            throw new Error("Course must be associated with a class.");
        }
        const newCourse: Course = {
            ...courseData,
            id: `course_${Date.now()}`,
            lessons: [],
            authorId: authorId
        };
        courses.push(newCourse);
        localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
        return newCourse;
    }
};

export const deleteCourse = (courseId: string): void => {
    // 1. Delete course videos and course data
    let courses = getCourses();
    const courseToDelete = courses.find(c => c.id === courseId);
    if (courseToDelete) {
        courseToDelete.lessons.forEach(lesson => {
            if (lesson.hasOfflineVideo) {
                deleteVideo(lesson.id).catch(err => console.error(`Failed to delete video for lesson ${lesson.id}:`, err));
            }
        });
    }
    courses = courses.filter(c => c.id !== courseId);
    localStorage.setItem(COURSES_KEY, JSON.stringify(courses));

    // 2. Delete associated student progress data
    const allProgress = getStudentProgress();
    const updatedProgress = allProgress.map(studentProgress => {
        // Filter out the course progress for the deleted course
        const newCourseProgress = studentProgress.courseProgress.filter(cp => cp.courseId !== courseId);

        // If progress was removed, recalculate the score history
        if (newCourseProgress.length < studentProgress.courseProgress.length) {
            const allCourseScores = newCourseProgress.map(cp => cp.score).filter(s => s > 0);
            const overallAverage = allCourseScores.length > 0 ? allCourseScores.reduce((sum, s) => sum + s, 0) / allCourseScores.length : 0;
            const today = new Date().toISOString().split('T')[0];
            
            const newScoreHistory = [...studentProgress.scoreHistory];
            const todayHistory = newScoreHistory.find(h => h.date === today);

            if (todayHistory) {
                todayHistory.score = overallAverage;
            } else {
                newScoreHistory.push({ date: today, score: overallAverage });
            }

            return {
                ...studentProgress,
                courseProgress: newCourseProgress,
                scoreHistory: newScoreHistory
            };
        }
        
        return studentProgress;
    });
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(updatedProgress));
};

export const saveLesson = async (
    courseId: string,
    lessonData: Omit<Lesson, 'id'> & { id?: string },
    videoFileAction?: File | null
): Promise<Lesson> => {
    const courses = getCourses();
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) throw new Error("Course not found");

    const course = courses[courseIndex];
    const isUpdate = !!lessonData.id;
    const lessonId = lessonData.id || `lesson_${Date.now()}`;
    const oldLesson = isUpdate ? course.lessons.find(l => l.id === lessonId) : undefined;

    // Handle DB operations based on video action
    if (videoFileAction instanceof File) {
        // A new file is being uploaded or an old one is being replaced.
        await saveVideo(lessonId, videoFileAction);
    } else if (videoFileAction === null) {
        // The video is being removed.
        if (oldLesson?.hasOfflineVideo) {
            await deleteVideo(lessonId);
        }
    } else if (lessonData.videoUrl && oldLesson?.hasOfflineVideo) {
        // Switching from an offline video to a URL.
        await deleteVideo(lessonId);
    }

    // Create the final lesson object to be saved.
    const finalLessonData: Lesson = {
        ...lessonData,
        id: lessonId,
        quiz: lessonData.quiz || [],
    };
    
    // Update the course array in memory.
    if (isUpdate) {
        const lessonIndex = course.lessons.findIndex(l => l.id === lessonId);
        if (lessonIndex > -1) {
            course.lessons[lessonIndex] = finalLessonData;
        } else {
            throw new Error("Lesson not found for updating");
        }
    } else {
        course.lessons.push(finalLessonData);
    }

    // Persist to localStorage.
    localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
    return finalLessonData;
};


export const deleteLesson = (courseId: string, lessonId: string): void => {
    const courses = getCourses();
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex > -1) {
        const lessonToDelete = courses[courseIndex].lessons.find(l => l.id === lessonId);
        if (lessonToDelete?.hasOfflineVideo) {
            deleteVideo(lessonId).catch(err => console.error(`Failed to delete video for lesson ${lessonId}:`, err));
        }
        courses[courseIndex].lessons = courses[courseIndex].lessons.filter(l => l.id !== lessonId);
    }
    localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
};

export const downloadLesson = async (lesson: Lesson): Promise<void> => {
    if (!lesson.videoUrl) return; // Only download lessons with video
    if (isLessonDownloaded(lesson.id)) return;

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

export const updateQuizProgress = (studentId: string, studentName: string, courseId: string, lessonId: string, score: number) => {
    const progressData = getStudentProgress();
    let studentProgress = progressData.find(p => p.studentId === studentId);

    if (!studentProgress) {
        studentProgress = {
            studentId,
            studentName,
            courseProgress: [],
            scoreHistory: []
        };
        progressData.push(studentProgress);
    }

    let courseProgress = studentProgress.courseProgress.find(cp => cp.courseId === courseId);
    const course = getCourses().find(c => c.id === courseId);

    if (!courseProgress) {
        courseProgress = {
            courseId,
            completedLessons: 0,
            totalLessons: course?.lessons.length || 0,
            score: 0,
            lessonStatus: []
        };
        studentProgress.courseProgress.push(courseProgress);
    }

    let lessonStatus = courseProgress.lessonStatus.find(ls => ls.lessonId === lessonId);
    if (!lessonStatus) {
        lessonStatus = { lessonId, attempts: 1, finalScore: score };
        courseProgress.lessonStatus.push(lessonStatus);
    } else {
        lessonStatus.attempts += 1;
        lessonStatus.finalScore = Math.max(lessonStatus.finalScore, score); // Keep best score
    }

    // Recalculate course progress
    const completedLessonsWithScore = courseProgress.lessonStatus.filter(ls => ls.finalScore > 0);
    courseProgress.completedLessons = completedLessonsWithScore.length;
    const totalScore = completedLessonsWithScore.reduce((sum, ls) => sum + ls.finalScore, 0);
    courseProgress.score = completedLessonsWithScore.length > 0 ? totalScore / completedLessonsWithScore.length : 0;
    
    // Recalculate and update student's overall score history
    const allCourseScores = studentProgress.courseProgress.map(cp => cp.score).filter(s => s > 0);
    const overallAverage = allCourseScores.length > 0 ? allCourseScores.reduce((sum, s) => sum + s, 0) / allCourseScores.length : 0;
    const today = new Date().toISOString().split('T')[0];
    const todayHistory = studentProgress.scoreHistory.find(h => h.date === today);
    if (todayHistory) {
        todayHistory.score = overallAverage;
    } else {
        studentProgress.scoreHistory.push({ date: today, score: overallAverage });
    }

    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressData));
};

// --- Search Functionality ---

export interface SearchResult {
  type: 'course' | 'lesson';
  course: Course;
  lesson?: Lesson;
  title: string;
  context: string;
}

export const searchContent = (query: string): SearchResult[] => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const lowerCaseQuery = query.toLowerCase();
  const courses = getCourses();
  const results: SearchResult[] = [];

  courses.forEach(course => {
    // Check course title and description
    if (
      course.title.toLowerCase().includes(lowerCaseQuery) ||
      course.description.toLowerCase().includes(lowerCaseQuery)
    ) {
      results.push({
        type: 'course',
        course: course,
        title: course.title,
        context: 'Course',
      });
    }

    // Check lessons within the course
    course.lessons.forEach(lesson => {
      // Create a stripped version of content to search on
      const strippedContent = lesson.content.replace(/<[^>]+>/g, '');
      if (
        lesson.title.toLowerCase().includes(lowerCaseQuery) ||
        strippedContent.toLowerCase().includes(lowerCaseQuery)
      ) {
        results.push({
          type: 'lesson',
          course: course,
          lesson: lesson,
          title: lesson.title,
          context: `In course: ${course.title}`,
        });
      }
    });
  });
  
  return results.slice(0, 10); // Limit to 10 results for performance
};