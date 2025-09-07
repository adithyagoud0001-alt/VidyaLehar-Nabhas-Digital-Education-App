import { UserRole } from "../constants";
import type { User, Student, Teacher } from "../types";

const USERS_KEY = 'vidyalehar_users';
const CURRENT_USER_KEY = 'vidyalehar_currentUser';

// Helper to get users from localStorage
const getUsers = (): User[] => {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
};

// Helper to save users to localStorage
const saveUsers = (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// Simple hashing function for demonstration. 
// In a real application, use a robust library like bcrypt.
const simpleHash = (password: string): string => {
    // This is NOT secure, for demo purposes only.
    return `hashed_${password}_${password.split("").reverse().join("")}`;
};

export const register = (username: string, password: string, role: UserRole, classNumber?: number): User => {
    const users = getUsers();
    
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        throw new Error('Username already exists.');
    }

    if (password.length < 4) {
        throw new Error('Password must be at least 4 characters long.');
    }

    let newUser: Student | Teacher;

    if (role === UserRole.STUDENT) {
        if (!classNumber) {
            throw new Error('Please select a class for the student.');
        }
        newUser = {
            id: `user_${Date.now()}`,
            username,
            passwordHash: simpleHash(password),
            role: UserRole.STUDENT,
            name: username, // Default name to username
            class: classNumber,
        };
    } else {
        if (!classNumber) {
            throw new Error('Please select a class for the teacher.');
        }
        newUser = {
            id: `user_${Date.now()}`,
            username,
            passwordHash: simpleHash(password),
            role: UserRole.TEACHER,
            name: username, // Default name to username
            class: classNumber,
        };
    }

    users.push(newUser);
    saveUsers(users);

    // Automatically log in the user after registration
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));

    return newUser;
};


export const login = (username: string, password: string): User => {
    const users = getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user || user.passwordHash !== simpleHash(password)) {
        throw new Error('Invalid username or password.');
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
};


export const logout = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = (): User | null => {
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
};

export const getAllStudents = (): Student[] => {
    const users = getUsers();
    return users.filter(u => u.role === UserRole.STUDENT) as Student[];
};

export const getStudentsByClass = (classNumber: number): Student[] => {
    const students = getAllStudents();
    return students.filter(s => s.class === classNumber);
};
