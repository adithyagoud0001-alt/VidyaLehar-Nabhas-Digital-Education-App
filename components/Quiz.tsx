import React, { useState, useEffect, useCallback } from 'react';
import type { QuizQuestion } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface QuizProps {
  questions: QuizQuestion[];
  onQuizComplete: (scorePercentage: number) => void;
}

const Quiz: React.FC<QuizProps> = ({ questions, onQuizComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const { t } = useTranslation();

  // Memoize the callback to prevent re-renders
  const memoizedOnQuizComplete = useCallback(onQuizComplete, []);

  useEffect(() => {
    if (showScore) {
      const scorePercentage = Math.round((score / questions.length) * 100);
      memoizedOnQuizComplete(scorePercentage);
    }
  }, [showScore, score, questions.length, memoizedOnQuizComplete]);

  const handleAnswerOptionClick = (selectedIndex: number) => {
    if (selectedAnswer !== null) return; 

    setSelectedAnswer(selectedIndex);
    const correct = selectedIndex === questions[currentQuestionIndex].correctAnswerIndex;
    setIsCorrect(correct);

    if (correct) {
      setScore(prevScore => prevScore + 1);
    }

    setTimeout(() => {
      const nextQuestion = currentQuestionIndex + 1;
      if (nextQuestion < questions.length) {
        setCurrentQuestionIndex(nextQuestion);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setShowScore(true);
      }
    }, 1500);
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setShowScore(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
  }

  if (showScore) {
    return (
      <div className="bg-brand-50 dark:bg-brand-900/30 p-6 rounded-lg text-center">
        <h4 className="text-xl font-bold text-brand-800 dark:text-brand-300">
          {t('quiz_result', { score: score, total: questions.length })}
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t('progress_saved')}</p>
        <button onClick={handleRestart} className="mt-4 px-6 py-2 bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600">
          {t('restart_quiz')}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-lg">
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {t('question_progress', { current: currentQuestionIndex + 1, total: questions.length })}
        </h4>
        <p className="text-slate-700 dark:text-slate-300 mt-1">{questions[currentQuestionIndex].question}</p>
      </div>
      <div className="space-y-3">
        {questions[currentQuestionIndex].options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          let buttonClass = 'bg-white dark:bg-slate-700 hover:bg-brand-100 dark:hover:bg-brand-900/30 border-slate-300 dark:border-slate-600';
          if (isSelected) {
            buttonClass = isCorrect ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500';
          } else if (selectedAnswer !== null && index === questions[currentQuestionIndex].correctAnswerIndex) {
            buttonClass = 'bg-green-500 text-white border-green-500';
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswerOptionClick(index)}
              disabled={selectedAnswer !== null}
              className={`w-full text-left p-4 rounded-lg border-2 transition ${buttonClass}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Quiz;