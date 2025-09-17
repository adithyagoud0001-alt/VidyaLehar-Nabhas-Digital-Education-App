import React, { useState, useEffect } from 'react';
import { getStudentProgress, getCourses } from '../services/offlineContentService';
import type { StudentProgress, Course } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface StudentProgressTrackerProps {
  studentId: string;
}

const StudentProgressTracker: React.FC<StudentProgressTrackerProps> = ({ studentId }) => {
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const { t } = useTranslation();
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
        const allProgress = await getStudentProgress();
        const studentProgress = allProgress.find(p => p.studentId === studentId) || null;
        setProgress(studentProgress);
        setCourses(await getCourses());
    };
    fetchData();
  }, [studentId]);

  const toggleCourseExpansion = (courseId: string) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  const getCourseTitle = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.title || courseId;
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
      <h3 className="font-bold text-xl mb-2 text-slate-800 dark:text-slate-100">{t('my_progress')}</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">{t('course_progress_overview')}</p>
      
      {!progress || progress.courseProgress.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">{t('no_progress_yet')}</p>
      ) : (
        <div className="space-y-6">
          {progress.courseProgress.map(cp => {
            const completionPercentage = (cp.totalLessons > 0) ? (cp.completedLessons / cp.totalLessons) * 100 : 0;
            const isExpanded = !!expandedCourses[cp.courseId];
            const courseDetails = courses.find(c => c.id === cp.courseId);
            
            return (
              <div key={cp.courseId} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0 pb-6 last:pb-0">
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-semibold text-slate-700 dark:text-slate-200">{getCourseTitle(cp.courseId)}</h4>
                      <span className="text-sm font-medium text-brand-700 dark:text-brand-400">{t('avg_score')}: {cp.score.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4" role="progressbar" aria-valuenow={completionPercentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${getCourseTitle(cp.courseId)} progress`}>
                    <div 
                      className="bg-brand-500 h-4 rounded-full text-xs text-white flex items-center justify-center" 
                      style={{ width: `${completionPercentage}%` }}
                    >
                     {completionPercentage > 15 && `${Math.round(completionPercentage)}%`}
                    </div>
                  </div>
                  <p className="text-right text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {cp.completedLessons} / {cp.totalLessons} {t('completed')}
                  </p>
                </div>
                
                {courseDetails && courseDetails.lessons.length > 0 && (
                  <div className="mt-4">
                    <button 
                      onClick={() => toggleCourseExpansion(cp.courseId)}
                      className="flex items-center text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      aria-expanded={isExpanded}
                      aria-controls={`lessons-${cp.courseId}`}
                    >
                      <span>{isExpanded ? t('hide_details') : t('show_details')}</span>
                      <ChevronDownIcon className={`h-5 w-5 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div id={`lessons-${cp.courseId}`} className="mt-3 pl-2 border-l-2 border-slate-200 dark:border-slate-600 animate-fade-in">
                        <ul className="space-y-2">
                          {courseDetails.lessons.map(lesson => {
                            const lessonStatus = cp.lessonStatus.find(ls => ls.lessonId === lesson.id);
                            const isCompleted = lessonStatus && lessonStatus.finalScore > 0;

                            return (
                              <li key={lesson.id} className="flex items-center text-sm">
                                {isCompleted ? (
                                  <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                                ) : (
                                  <div className="h-5 w-5 mr-2 flex-shrink-0 flex items-center justify-center">
                                    <div className="h-3 w-3 rounded-full border-2 border-slate-400 dark:border-slate-500"></div>
                                  </div>
                                )}
                                <span className={isCompleted ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}>
                                  {lesson.title}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default StudentProgressTracker;
