import { createClient } from '@supabase/supabase-js';
import { UserRole } from '../constants';

// Your Supabase credentials are now loaded from environment variables.
// This is a critical security practice for deployment.
// Fix: Cast `import.meta` to `any` to bypass TypeScript error "Property 'env' does not exist on type 'ImportMeta'".
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This provides a clear error message in the developer console
  // if the environment variables are not set up correctly.
  throw new Error("Supabase URL and anon key are required. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.");
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