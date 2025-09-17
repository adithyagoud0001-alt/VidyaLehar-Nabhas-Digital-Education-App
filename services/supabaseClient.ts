import { createClient } from '@supabase/supabase-js';
import type { Course, Lesson, StudentProgress } from '../types';
import { UserRole } from '../constants';

// Your Supabase credentials have been inserted here.
const supabaseUrl = 'https://ovibdtpvvjqehosycfzt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aWJkdHB2dmpxZWhvc3ljZnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTc0NTAsImV4cCI6MjA3MzY5MzQ1MH0.l6-iWr4ANOotUPl5vcUWJprHjXiL5Y2REmiB-WJH6bo';

// The warning for placeholder credentials has been removed as they are now set.

// Fix: Add Json helper type to prevent Supabase client from failing to parse types for jsonb columns.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
    id: string; // matches auth.users.id
    username: string;
    role: UserRole;
    class: number;
}

// Supabase has its own User object, we'll mainly use our Profile type.
export interface Database {
  public: {
    Tables: {
      // Fix: Use explicit object literals instead of generic types to avoid type inference issues.
      profiles: {
        Row: {
          id: string;
          username: string;
          role: UserRole;
          class: number;
        };
        Insert: {
          id: string;
          username: string;
          role: UserRole;
          class: number;
        };
        Update: {
          username?: string;
          role?: UserRole;
          class?: number;
        };
      };
      // Fix: Use explicit object literals instead of generic types to avoid type inference issues.
      courses: {
        Row: {
          id: string;
          title: string;
          description: string;
          icon: 'Book' | 'Computer' | 'Calculator';
          authorId: string;
          forClass: number;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          icon: 'Book' | 'Computer' | 'Calculator';
          authorId: string;
          forClass: number;
        };
        Update: {
          title?: string;
          description?: string;
          icon?: 'Book' | 'Computer' | 'Calculator';
          authorId?: string;
          forClass?: number;
        };
      };
      lessons: {
        // Fix: Use an explicit object literal for the Row to correctly type optional fields as nullable for the DB.
        // This avoids potential type inference failures with complex Omit/& constructs.
        Row: {
          id: string;
          title: string;
          content: string;
          summary: string | null;
          videoUrl: string | null;
          difficulty: ('Easy' | 'Medium' | 'Hard') | null;
          course_id: string;
          quiz: Json;
          transcript: Json | null;
        };
        // Fix: Use an explicit object literal for Insert type for clarity and consistency.
        Insert: {
          id: string;
          title: string;
          content: string;
          summary?: string | null;
          videoUrl?: string | null;
          difficulty?: 'Easy' | 'Medium' | 'Hard' | null;
          course_id: string;
          quiz: Json;
          transcript?: Json | null;
        };
        // Fix: Use an explicit, partial object literal for Update, excluding the primary key 'id'.
        Update: Partial<{
          title: string;
          content: string;
          summary: string | null;
          videoUrl: string | null;
          difficulty: 'Easy' | 'Medium' | 'Hard' | null;
          course_id: string;
          quiz: Json;
          transcript: Json | null;
        }>;
      };
      // Fix: Use explicit object literals instead of generic types to avoid type inference issues.
      student_progress: {
        Row: {
            studentId: string;
            studentName: string;
            courseProgress: Json;
            scoreHistory: Json;
        };
        Insert: {
            studentId: string;
            studentName: string;
            courseProgress: Json;
            scoreHistory: Json;
        };
        Update: {
            studentName?: string;
            courseProgress?: Json;
            scoreHistory?: Json;
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
}


export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);