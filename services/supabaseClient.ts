import { createClient } from '@supabase/supabase-js';
import { UserRole } from '../constants';

// Your Supabase credentials have been inserted here.
const supabaseUrl = 'https://ovibdtpvvjqehosycfzt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92aWJkdHB2dmpxZWhvc3ljZnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTc0NTAsImV4cCI6MjA3MzY5MzQ1MH0.l6-iWr4ANOotUPl5vcUWJprHjXiL5Y2REmiB-WJH6bo';

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
      courses: {
        Row: {
          id: string;
          title: string;
          description: string;
          icon: string;
          author_id: string;
          for_class: number;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          icon: string;
          author_id: string;
          for_class: number;
        };
        Update: {
          title?: string;
          description?: string;
          icon?: string;
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
          difficulty: string | null;
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
          difficulty?: string | null;
        };
        Update: {
          title?: string;
          content?: string;
          summary?: string | null;
          video_url?: string | null;
          transcript?: Json | null;
          quiz?: Json;
          difficulty?: string | null;
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
