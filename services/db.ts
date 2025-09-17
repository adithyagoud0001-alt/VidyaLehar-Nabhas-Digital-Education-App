import Dexie, { type Table } from 'dexie';
import type { Course, Lesson, StudentProgress } from '../types';
// Fix: Removed direct import of `Profile` and instead import `Database` to derive it.
import type { Database } from './supabaseClient';

// Fix: Define Profile type locally from the central Database definition for consistency.
type Profile = Database['public']['Tables']['profiles']['Row'];

// Define a type for offline mutations
export interface SyncQueueItem {
    id?: number;
    type: 'UPDATE_PROGRESS' | 'SAVE_COURSE' | 'DELETE_COURSE' | 'SAVE_LESSON' | 'DELETE_LESSON';
    payload: any;
    timestamp: number;
}


// Fix: Refactor to not use a Dexie subclass, which can cause TypeScript inheritance issues.
// This new structure ensures 'version' and 'transaction' methods are correctly typed.
export const db = new Dexie('vidyaleharLocalDB') as Dexie & {
    courses: Table<Course>;
    lessons: Table<Lesson & { courseId: string }>; // Store lessons flat with a courseId
    studentProgress: Table<StudentProgress, string>; // studentId is the primary key
    profiles: Table<Profile, string>; // id is primary key
    syncQueue: Table<SyncQueueItem>;
    // For teacher-uploaded videos
    videos: Table<{ id: string; blob: Blob }, string>; // Storing an object with id and blob
};

db.version(2).stores({
    courses: 'id, authorId, forClass',
    lessons: 'id, courseId',
    studentProgress: 'studentId', // primary key
    profiles: 'id, class', // primary key
    // Fix: Add 'type' to the index to allow querying by action type.
    syncQueue: '++id, type, timestamp', // auto-incrementing id, index on type and timestamp
    videos: 'id', // primary key is the 'id' property of the stored object
});
