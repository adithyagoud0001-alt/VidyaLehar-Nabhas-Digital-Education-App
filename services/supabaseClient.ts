

import { createClient } from '@supabase/supabase-js';
// FIX: Removed import of UserRole to make the Database type self-contained and prevent type resolution issues.
// import { UserRole } from '../constants';

// User-provided Supabase credentials to make the app functional.
// In a production environment, these should be stored securely as environment variables.
const supabaseUrl = 'https://ovibdtpvvjqehosycfzt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aWJkdHB2dmpxZWhvc3ljZnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTc0NTAsImV4cCI6MjA3MzY5MzQ1MH0.l6-iWr4ANOotUPl5vcUWJprHjXiL5Y2REmiB-WJH6bo';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and anon key are required.");
}


export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Fix: Switched from `interface` to `type` for the Database definition to fix Supabase client type inference.
// The separate `Profile` interface was removed, and the `role` type was updated to use the `UserRole` enum for consistency.
// This resolves the 'never' type errors across the app.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          // FIX: Replaced imported enum with string literal type to fix type inference.
          role: 'Student' | 'Teacher';
          class: number;
        };
        Insert: {
          id: string;
          username: string;
          // FIX: Replaced imported enum with string literal type to fix type inference.
          role: 'Student' | 'Teacher';
          class: number;
        };
        Update: {
          username?: string;
          // FIX: Replaced imported enum with string literal type to fix type inference.
          role?: 'Student' | 'Teacher';
          class?: number;
        };
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string;
          // FIX: Used specific string literal type for better type safety.
          icon: 'Book' | 'Computer' | 'Calculator';
          author_id: string;
          for_class: number;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          // FIX: Used specific string literal type for better type safety.
          icon: 'Book' | 'Computer' | 'Calculator';
          author_id: string;
          for_class: number;
        };
        Update: {
          title?: string;
          description?: string;
          // FIX: Used specific string literal type for better type safety.
          icon?: 'Book' | 'Computer' | 'Calculator';
        };
      };
      lessons: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          content: string;
          summary: string | null;
          video_url: string | null;
          transcript: Json | null;
          quiz: Json;
          // FIX: Used specific string literal type for better type safety.
          difficulty: 'Easy' | 'Medium' | 'Hard' | null;
        };
        Insert: {
          id: string;
          course_id: string;
          title: string;
          content: string;
          summary?: string | null;
          video_url?: string | null;
          transcript?: Json | null;
          quiz: Json;
          // FIX: Used specific string literal type for better type safety.
          difficulty?: 'Easy' | 'Medium' | 'Hard' | null;
        };
        Update: {
          title?: string;
          content?: string;
          summary?: string | null;
          video_url?: string | null;
          transcript?: Json | null;
          quiz?: Json;
          // FIX: Used specific string literal type for better type safety.
          difficulty?: 'Easy' | 'Medium' | 'Hard' | null;
        };
      };
      student_progress: {
        Row: {
            student_id: string;
            student_name: string;
            course_progress: Json | null;
            score_history: Json | null;
        };
        Insert: {
            student_id: string;
            student_name: string;
            course_progress?: Json | null;
            score_history?: Json | null;
        };
        Update: {
            student_name?: string;
            course_progress?: Json | null;
            score_history?: Json | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
};


export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
