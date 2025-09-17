import { UserRole } from "../constants";
import type { User, Student, Teacher } from "../types";
import { supabase, type Profile } from './supabaseClient';
import { db } from './db';

const constructAppUser = (profile: Profile): User => {
    return {
        id: profile.id,
        username: profile.username,
        role: profile.role,
        class: profile.class,
    };
};

export const register = async (username: string, password: string, role: UserRole, classNumber?: number): Promise<User> => {
    if (!classNumber) {
        throw new Error('Class number is required for registration.');
    }
    if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
    }

    // Supabase requires email for sign up, we'll use a dummy email since we are username-based.
    const email = `${username.toLowerCase()}@vidyalehar.local`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: username,
            }
        }
    });

    if (authError) {
        throw new Error(authError.message);
    }
    if (!authData.user) {
        throw new Error("Registration failed: no user returned.");
    }
    
    // Now create a profile for the user in our public profiles table
    const newProfile: Profile = {
        id: authData.user.id,
        username: username,
        role: role,
        class: classNumber,
    };

    // Fix: Wrap insert argument in an array to match expected overloads.
    const { error: profileError } = await supabase.from('profiles').insert([newProfile]);

    if (profileError) {
        // If profile creation fails, we should ideally delete the auth user to avoid orphaned users.
        // This is an advanced topic (e.g. use a Supabase function), for now, we'll just throw.
        throw new Error(`Could not create user profile: ${profileError.message}`);
    }

    // Also save profile to local DB
    await db.profiles.put(newProfile);

    return constructAppUser(newProfile);
};


export const login = async (username: string, password: string): Promise<User> => {
    // We still use dummy email for login
    const email = `${username.toLowerCase()}@vidyalehar.local`;
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (authError) {
        throw new Error(authError.message);
    }
    if (!authData.user) {
        throw new Error("Login failed: no user returned.");
    }

    // Fetch the user's profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
    
    if (profileError || !profile) {
        throw new Error("Login failed: could not retrieve user profile.");
    }

    // Also save profile to local DB
    await db.profiles.put(profile);

    return constructAppUser(profile);
};


export const logout = async () => {
    await supabase.auth.signOut();
};

export const getCurrentUser = async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
        return null;
    }

    // Check local DB first for faster startup
    let profile = await db.profiles.get(session.user.id);

    if (!profile) {
        // If not in local DB, fetch from remote
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || !data) {
            console.error("Could not fetch profile for active session:", error);
            // This might mean the session is stale, signing out.
            await logout();
            return null;
        }
        profile = data;
        await db.profiles.put(profile); // Cache for next time
    }

    return constructAppUser(profile);
};

export const getAllStudents = async (): Promise<Student[]> => {
    const profiles = await db.profiles.toArray();
    const studentProfiles = profiles.filter(p => p.role === UserRole.STUDENT);
    return studentProfiles.map(p => ({
        ...constructAppUser(p),
        name: p.username,
        role: UserRole.STUDENT,
    }));
};

export const getStudentsByClass = async (classNumber: number): Promise<Student[]> => {
    const studentProfiles = await db.profiles.where({ class: classNumber, role: UserRole.STUDENT }).toArray();
    return studentProfiles.map(p => ({
        ...constructAppUser(p),
        name: p.username,
        role: UserRole.STUDENT,
    }));
};