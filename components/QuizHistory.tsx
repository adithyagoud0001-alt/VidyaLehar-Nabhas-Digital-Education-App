import React, { useState, useEffect } from 'react';
import { getStudentProgress, getCourses } from '../services/offlineContentService';
import type { StudentProgress, Course, LessonStatus } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface QuizHistoryProps {
  studentId: string;
}

interface QuizResult {
  courseTitle: string;
  lessonTitle: string;
  status: LessonStatus;
}

const QuizHistory: React.FC<QuizHistoryProps> = ({ studentId }) => {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchData = async () => {
        const allProgress = await getStudentProgress();
        const studentProgress = allProgress.find(p => p.studentId === studentId);
        const courses = await getCourses();

        if (studentProgress) {
            const lessonMap = new Map<string, { lessonTitle: string, courseTitle: string }>();
            courses.forEach(course => {
                course.lessons.forEach(lesson => {
                    lessonMap.set(lesson.id, { lessonTitle: lesson.title, courseTitle: course.title });
                });
            });
            
            const results: QuizResult[] = [];
            studentProgress.courseProgress.forEach(cp => {
                cp.lessonStatus.forEach(ls => {
                    const lessonInfo = lessonMap.get(ls.lessonId);
                    if (lessonInfo) {
                        results.push({
                            courseTitle: lessonInfo.courseTitle,
                            lessonTitle: lessonInfo.lessonTitle,
                            status: ls
                        });
                    }
                });
            });
            setQuizResults(results);
        }
    };
    fetchData();
  }, [studentId]);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
      <p className="text-slate-600 dark:text-slate-400 mb-6">{t('quiz_history_description')}</p>
      
      {quizResults.length === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400 py-8">{t('no_quiz_attempts_yet')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">{t('course')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">{t('lesson')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">{t('best_score')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">{t('attempts')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {quizResults.map((result, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{result.courseTitle}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">{result.lessonTitle}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                    <span className={`font-semibold ${result.status.finalScore > 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {result.status.finalScore.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{result.status.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QuizHistory;
