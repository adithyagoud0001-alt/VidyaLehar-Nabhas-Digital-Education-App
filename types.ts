import { UserRole } from './constants';

// --- User & Auth ---
// This is a combined type for app use, derived from Supabase Auth user and our custom Profile table.
export interface User {
  id: string;
  username: string; // From our 'profiles' table
  role: UserRole;   // From our 'profiles' table
  class: number;    // From our 'profiles' table
}

export interface Student extends User {
  role: UserRole.STUDENT;
  name: string; // Same as username
}

export interface Teacher extends User {
  role: UserRole.TEACHER;
  name: string; // Same as username
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

// Fix: Add and export SearchResult type to be used across the application.
export interface SearchResult {
  type: 'course' | 'lesson';
  course: Course;
  lesson?: Lesson;
  title: string;
  context: string;
}

// --- App State ---
export type View = 'AUTH' | 'DASHBOARD' | 'LESSON';

export interface AppState {
    currentUser: User | null;
    currentView: View;
    selectedCourse: Course | null;
    selectedLesson: Lesson | null;
}