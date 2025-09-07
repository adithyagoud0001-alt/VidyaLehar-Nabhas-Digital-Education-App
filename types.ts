import { UserRole } from './constants';

// --- User & Auth ---
export interface User {
  id: string;
  username: string;
  passwordHash: string; // In a real app, never store plain text passwords
  role: UserRole;
}

export interface Student extends User {
  role: UserRole.STUDENT;
  name: string;
  class: number;
}

export interface Teacher extends User {
  role: UserRole.TEACHER;
  name: string; // Could be extended with school info, etc.
  class: number;
}

// --- Content ---
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface TranscriptEntry {
  text: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface Lesson {
  id: string;
  title: string;
  content: string; 
  summary?: string;
  videoUrl?: string;
  hasOfflineVideo?: boolean; // Flag for teacher-uploaded videos stored in IndexedDB
  transcript?: TranscriptEntry[];
  quiz: QuizQuestion[];
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

export interface Course {
  id: string;
  title: string;
  description: string;
  icon: 'Book' | 'Computer' | 'Calculator';
  lessons: Lesson[];
  authorId: string; // Link course to the teacher who created it
  forClass: number;
}

// --- Progress Tracking ---
export interface LessonStatus {
  lessonId: string;
  attempts: number;
  finalScore: number; // Score in percentage
}

export interface ScoreHistory {
    date: string; // YYYY-MM-DD
    score: number; // Overall average score
}

export interface CourseProgress {
  courseId: string;
  completedLessons: number;
  totalLessons: number;
  score: number; // Average score across completed lessons in percentage
  lessonStatus: LessonStatus[];
}

export interface StudentProgress {
  studentId: string;
  studentName: string;
  courseProgress: CourseProgress[];
  scoreHistory: ScoreHistory[];
}

// --- App State ---
export type View = 'AUTH' | 'DASHBOARD' | 'LESSON';

export interface AppState {
    currentUser: User | Student | null;
    currentView: View;
    selectedCourse: Course | null;
    selectedLesson: Lesson | null;
}