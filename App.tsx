import React, { useState, useEffect, useCallback } from 'react';
import { UserRole } from './constants';
import type { AppState, Course, Lesson, User, Student, Teacher } from './types';
import Header from './components/Header';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import LessonView from './components/LessonView';
import AuthScreen from './components/AuthScreen';
import { getCurrentUser, logout } from './services/authService';
import { initializeData, type SearchResult } from './services/offlineContentService';


const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    currentUser: null,
    currentView: 'AUTH',
    selectedCourse: null,
    selectedLesson: null,
  });
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    // On first load, check for an existing session and initialize mock data if needed
    initializeData();
    const user = getCurrentUser();
    if (user) {
      handleLogin(user);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = useCallback((user: User) => {
    setAppState({
      ...appState,
      currentUser: user,
      currentView: 'DASHBOARD',
    });
  }, [appState]);

  const handleLogout = useCallback(() => {
    logout();
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

  const renderContent = () => {
    if (!appState.currentUser) {
        return <AuthScreen onLogin={handleLogin} />;
    }

    switch (appState.currentView) {
      case 'DASHBOARD':
        if (appState.currentUser.role === UserRole.STUDENT) {
          return <StudentDashboard user={appState.currentUser as Student} onSelectCourse={handleSelectCourse} />;
        }
        if (appState.currentUser.role === UserRole.TEACHER) {
          return <TeacherDashboard user={appState.currentUser as Teacher} />;
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
        return null;
      default:
         return <AuthScreen onLogin={handleLogin} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      {appState.currentUser && (
        <Header 
          user={appState.currentUser}
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