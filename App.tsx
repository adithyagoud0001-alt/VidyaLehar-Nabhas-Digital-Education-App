import React, { useState, useEffect, useCallback } from 'react';
import { UserRole } from './constants';
// Fix: Import SearchResult from types.ts where it is now defined.
import type { AppState, Course, Lesson, User, Student, Teacher, SearchResult } from './types';
import Header from './components/Header';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import LessonView from './components/LessonView';
import AuthScreen from './components/AuthScreen';
import { getCurrentUser, logout } from './services/authService';
// Fix: Removed incorrect SearchResult import from here. The type is now correctly imported from './types'.
import { syncDown, processSyncQueue } from './services/syncService';


const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    currentUser: null,
    currentView: 'AUTH',
    selectedCourse: null,
    selectedLesson: null,
  });
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const handleLogin = useCallback(async (user: User) => {
    setIsLoading(true);
    // Fix: Process the sync queue before syncing down to prevent data loss.
    // This pushes any local changes (like a new course) to the server first.
    await processSyncQueue();
    // On login, fetch all latest data from Supabase
    await syncDown();
    setAppState({
      ...appState,
      currentUser: user,
      currentView: 'DASHBOARD',
    });
    setIsLoading(false);
  }, [appState]);

  // Check session on initial load
  useEffect(() => {
    const checkSession = async () => {
      const user = await getCurrentUser();
      if (user) {
        handleLogin(user);
      } else {
        setIsLoading(false);
      }
    };
    checkSession();

    // Setup online/offline listeners
    const handleOnline = async () => {
        setIsOnline(true);
        console.log("Back online, processing sync queue...");
        await processSyncQueue();
        // Optionally, trigger a sync down as well to get changes made on other devices
        if(appState.currentUser) {
            await syncDown();
        }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // Run only once

  const handleLogout = useCallback(async () => {
    await logout();
    setAppState({
        currentUser: null,
        currentView: 'AUTH',
        selectedCourse: null,
        selectedLesson: null,
    });
  }, []);

  const handleSelectCourse = useCallback((course: Course) => {
      if (course.lessons.length > 0) {
        setAppState(prev => ({
            ...prev,
            selectedCourse: course,
            selectedLesson: course.lessons[0],
            currentView: 'LESSON'
        }));
      }
  }, []);

  const handleSelectLesson = useCallback((lesson: Lesson) => {
    setAppState(prev => ({ ...prev, selectedLesson: lesson }));
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setAppState(prev => ({
        ...prev,
        currentView: 'DASHBOARD',
        selectedCourse: null,
        selectedLesson: null
    }));
  }, []);
  
  const handleSearchSelect = useCallback((result: SearchResult) => {
    setAppState(prev => ({
        ...prev,
        currentView: 'LESSON',
        selectedCourse: result.course,
        selectedLesson: result.lesson || result.course.lessons[0],
    }));
  }, []);
  
  const renderLoading = () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-600"></div>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
        return renderLoading();
    }
    
    if (!appState.currentUser) {
        return <AuthScreen onLogin={handleLogin} />;
    }

    switch (appState.currentView) {
      case 'DASHBOARD':
        if (appState.currentUser.role === UserRole.STUDENT) {
          const studentUser = { ...appState.currentUser, name: appState.currentUser.username } as Student;
          return <StudentDashboard user={studentUser} onSelectCourse={handleSelectCourse} />;
        }
        if (appState.currentUser.role === UserRole.TEACHER) {
          const teacherUser = { ...appState.currentUser, name: appState.currentUser.username } as Teacher;
          return <TeacherDashboard user={teacherUser} />;
        }
        return null;
      case 'LESSON':
        if (appState.selectedCourse && appState.selectedLesson && appState.currentUser) {
          return (
            <LessonView 
                course={appState.selectedCourse}
                lesson={appState.selectedLesson}
                user={appState.currentUser as Student | Teacher}
                onSelectLesson={handleSelectLesson}
                onBack={handleBackToDashboard}
                isOnline={isOnline}
            />
          );
        }
        // If something is wrong, go back to dashboard
        handleBackToDashboard();
        return null;
      default:
         return <AuthScreen onLogin={handleLogin} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      {appState.currentUser && !isLoading && (
        <Header 
          user={{...appState.currentUser, name: appState.currentUser.username}}
          isOnline={isOnline}
          onLogout={handleLogout}
          onSearchSelect={handleSearchSelect}
        />
      )}
      <main className="p-4 sm:p-6 lg:p-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;