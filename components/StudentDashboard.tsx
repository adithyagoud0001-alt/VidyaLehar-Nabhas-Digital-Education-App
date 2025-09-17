import React, { useState, useEffect } from 'react';
import type { Course, Student } from '../types';
import { getCoursesForClass } from '../services/offlineContentService';
import DashboardCard from './DashboardCard';
import StudentProgressTracker from './StudentProgressTracker';
import QuizHistory from './QuizHistory';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { useTranslation } from '../hooks/useTranslation';

interface StudentDashboardProps {
  user: Student;
  onSelectCourse: (course: Course) => void;
}

const iconMap = {
    Book: <BookOpenIcon className="h-12 w-12 text-white" />,
    Calculator: <ChartBarIcon className="h-12 w-12 text-white" />,
    Computer: <SparklesIcon className="h-12 w-12 text-white" />
};

type PerformanceTab = 'progress' | 'quiz';

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onSelectCourse }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<PerformanceTab>('progress');
  const { t } = useTranslation();

  useEffect(() => {
    const fetchCourses = async () => {
        const coursesData = await getCoursesForClass(user.class);
        setCourses(coursesData);
    };
    fetchCourses();
  }, [user.class]);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('welcome_student', { name: user.name })}</h2>
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <button onClick={() => setIsDetailsVisible(!isDetailsVisible)} className="flex justify-between items-center w-full">
                <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">{t('student_details')}</h3>
                <div className="flex items-center text-sm text-brand-600 dark:text-brand-400 font-semibold">
                    <span>{isDetailsVisible ? t('hide_details') : t('show_details')}</span>
                    <ChevronDownIcon className={`h-5 w-5 ml-1 transition-transform ${isDetailsVisible ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {isDetailsVisible && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 space-y-2">
                    <p><span className="font-semibold">{t('username')}:</span> {user.username}</p>
                    <p><span className="font-semibold">{t('class')}:</span> {user.class}</p>
                </div>
            )}
        </div>
      </div>

      <div id="performance">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t('my_performance')}</h3>
        <div className="border-b border-slate-200 dark:border-slate-700 mb-4">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button 
                    onClick={() => setActiveTab('progress')}
                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'progress' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                >
                    {t('progress_overview')}
                </button>
                 <button 
                    onClick={() => setActiveTab('quiz')}
                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'quiz' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                >
                    {t('quiz_history')}
                </button>
            </nav>
        </div>
        <div>
            {activeTab === 'progress' && <StudentProgressTracker studentId={user.id} />}
            {activeTab === 'quiz' && <QuizHistory studentId={user.id} />}
        </div>
      </div>

      <div id="courses">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('my_courses')}</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">{t('select_course_prompt')}</p>
        
        {courses.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-lg shadow">
            <p className="text-slate-500 dark:text-slate-400">{t('no_courses_available')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, index) => (
              <DashboardCard
                key={course.id}
                title={course.title}
                description={course.description}
                icon={iconMap[course.icon]}
                colorIndex={index}
                onClick={() => onSelectCourse(course)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
