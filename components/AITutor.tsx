import React, { useState } from 'react';
import { askAITutor } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import { useTranslation } from '../hooks/useTranslation';
import type { Student, Teacher } from '../types';

interface AITutorProps {
  lessonContext: string;
  isOnline: boolean;
  lessonTitle: string;
  user: Student | Teacher;
  performanceContext: { attempts: number; bestScore: number } | null;
}

const AITutor: React.FC<AITutorProps> = ({ lessonContext, isOnline, lessonTitle, user, performanceContext }) => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setResponse('');
    setError('');

    try {
      const aiResponse = await askAITutor(question, lessonContext, lessonTitle, user, performanceContext);
      setResponse(aiResponse);
    } catch (err) {
      setError('Sorry, I am having trouble connecting. Please try again later.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOnline) {
      return (
           <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg text-center text-slate-600 dark:text-slate-400">
              <p>{t('ai_tutor_offline_message')}</p>
           </div>
      )
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('ask_a_question_placeholder')}
          className="flex-grow p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md focus:ring-2 focus:ring-brand-400 focus:outline-none"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="flex items-center justify-center px-6 py-3 bg-brand-700 text-white font-semibold rounded-md hover:bg-brand-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition"
        >
          <SparklesIcon className="h-5 w-5 mr-2" />
          {isLoading ? t('thinking') : t('ask')}
        </button>
      </form>

      {error && <p className="text-red-600 mt-2">{error}</p>}
      
      {isLoading && (
         <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <p className="ml-3 text-slate-600 dark:text-slate-400">{t('ai_tutor_thinking_message')}</p>
         </div>
      )}

      {response && (
        <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-md prose dark:prose-invert max-w-none">
          <p>{response}</p>
        </div>
      )}
    </div>
  );
};

export default AITutor;