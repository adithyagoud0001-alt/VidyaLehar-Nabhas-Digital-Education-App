import React, { useState, useEffect } from 'react';
import type { Lesson, QuizQuestion } from '../types';
import { saveLesson } from '../services/offlineContentService';
import { generateLessonSummary } from '../services/geminiService';
import { useTranslation } from '../hooks/useTranslation';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface LessonEditorProps {
  lesson: Lesson | null;
  courseId: string;
  onSave: () => void;
  onCancel: () => void;
}

const emptyQuestion: QuizQuestion = {
    question: '',
    options: ['', ''],
    correctAnswerIndex: 0
};

const LessonEditor: React.FC<LessonEditorProps> = ({ lesson, courseId, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const { t } = useTranslation();
  
  // Video state
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFileName, setVideoFileName] = useState('');
  const [hasExistingOfflineVideo, setHasExistingOfflineVideo] = useState(false);
  const [removeVideo, setRemoveVideo] = useState(false);

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      setContent(lesson.content);
      setSummary(lesson.summary || '');
      setDifficulty(lesson.difficulty || 'Easy');
      setQuiz(lesson.quiz ? JSON.parse(JSON.stringify(lesson.quiz)) : []);
      // Video state
      setVideoUrl(lesson.videoUrl || '');
      setHasExistingOfflineVideo(!!lesson.hasOfflineVideo);
    } else {
        setTitle('');
        setContent('');
        setSummary('');
        setDifficulty('Easy');
        setVideoUrl('');
        setQuiz([]);
        setHasExistingOfflineVideo(false);
    }
    // Reset transient state on lesson change
    setVideoFile(null);
    setVideoFileName('');
    setRemoveVideo(false);
    setError('');
  }, [lesson]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoFileName(file.name);
      setVideoUrl(''); // Clear URL if file is chosen
      setHasExistingOfflineVideo(false);
      setRemoveVideo(false);
    }
  };

  const handleRemoveVideo = () => {
    setRemoveVideo(true);
    setVideoFile(null);
    setVideoFileName('');
    setVideoUrl('');
    setHasExistingOfflineVideo(false);
  };

  const handleQuizChange = <K extends keyof QuizQuestion>(qIndex: number, field: K, value: QuizQuestion[K]) => {
    const newQuiz = [...quiz];
    newQuiz[qIndex][field] = value;
    setQuiz(newQuiz);
  };
  
  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const newQuiz = [...quiz];
    newQuiz[qIndex].options[oIndex] = value;
    setQuiz(newQuiz);
  };

  const addQuestion = () => setQuiz([...quiz, { ...emptyQuestion, options: ['', ''] }]);
  const removeQuestion = (qIndex: number) => setQuiz(quiz.filter((_, i) => i !== qIndex));

  const addOption = (qIndex: number) => {
    const newQuiz = [...quiz];
    if (newQuiz[qIndex].options.length < 4) { // Limit options for simplicity
        newQuiz[qIndex].options.push('');
        setQuiz(newQuiz);
    }
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const newQuiz = [...quiz];
    if (newQuiz[qIndex].options.length > 2) { // Must have at least 2 options
        const oldCorrectIndex = newQuiz[qIndex].correctAnswerIndex;
        newQuiz[qIndex].options.splice(oIndex, 1);
        
        if (oldCorrectIndex === oIndex) {
            newQuiz[qIndex].correctAnswerIndex = 0;
        } else if (oldCorrectIndex > oIndex) {
            newQuiz[qIndex].correctAnswerIndex = oldCorrectIndex - 1;
        }
        
        setQuiz(newQuiz);
    }
  };

  const handleGenerateSummary = async () => {
    if (!content.trim() || !title.trim()) {
        setError('Please provide a title and content before generating a summary.');
        return;
    }
    setIsGeneratingSummary(true);
    setError('');
    try {
        const generatedSummary = await generateLessonSummary(title, content);
        setSummary(generatedSummary);
    } catch (err: any) {
        setError(err.message || 'Failed to generate summary.');
    } finally {
        setIsGeneratingSummary(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
        setError('Title and content are required.');
        return;
    }
    for (const q of quiz) {
        if (!q.question.trim() || q.options.some(o => !o.trim())) {
            setError('Please fill out all fields in the quiz questions.');
            return;
        }
    }
    setError('');

    const lessonData = {
      id: lesson?.id,
      title,
      content,
      summary,
      difficulty,
      quiz,
      videoUrl: videoFile || removeVideo ? undefined : videoUrl.trim() || undefined,
      hasOfflineVideo: !!videoFile || (hasExistingOfflineVideo && !removeVideo && !videoUrl),
    };

    let videoFileAction: File | null | undefined = undefined; // undefined: no change
    if (videoFile) {
        videoFileAction = videoFile; // new file to upload
    } else if (removeVideo) {
        videoFileAction = null; // signal to remove existing video
    }

    try {
        await saveLesson(courseId, lessonData, videoFileAction);
        onSave();
    } catch (err: any) {
        setError(err.message);
    }
  };

  const showVideoUrlInput = !videoFile && !hasExistingOfflineVideo && !removeVideo;

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl p-6 flex flex-col" style={{ maxHeight: '90vh' }}>
        <h2 className="text-2xl font-bold mb-4 flex-shrink-0">{lesson ? 'Edit Lesson' : 'Create New Lesson'}</h2>
        
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto pr-3 space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
                <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500" required />
              </div>
               <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Difficulty</label>
                <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
                >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                </select>
              </div>
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Content (HTML supported)</label>
                <textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={5} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500" required />
              </div>

               <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="summary" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('lesson_summary')}</label>
                  <button
                    type="button"
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary || !content.trim() || !title.trim()}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SparklesIcon className="h-4 w-4" />
                    {isGeneratingSummary ? t('generating') : t('generate_with_ai')}
                  </button>
                </div>
                <textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={4}
                  placeholder={t('summary_placeholder')}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Lesson Video</label>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                      {hasExistingOfflineVideo && !removeVideo && !videoFile && (
                          <div className="flex items-center justify-between p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-md">
                              <span>A video file has been uploaded for this lesson.</span>
                              <button type="button" onClick={handleRemoveVideo} className="p-1 rounded-full hover:bg-black/10"><XMarkIcon className="h-4 w-4"/></button>
                          </div>
                      )}
                      {videoFile && (
                          <div className="flex items-center justify-between p-2 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 rounded-md">
                              <span className="truncate pr-2">{videoFileName}</span>
                              <button type="button" onClick={handleRemoveVideo} className="p-1 rounded-full hover:bg-black/10"><XMarkIcon className="h-4 w-4"/></button>
                          </div>
                      )}

                      {showVideoUrlInput && (
                        <div>
                            <input id="videoUrl" type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Enter video URL..." className="block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500" />
                            <div className="flex items-center my-2">
                                <hr className="flex-grow border-slate-300 dark:border-slate-600"/>
                                <span className="mx-2 text-xs text-slate-500">OR</span>
                                <hr className="flex-grow border-slate-300 dark:border-slate-600"/>
                            </div>
                        </div>
                      )}

                      {(!videoFile && !hasExistingOfflineVideo) || removeVideo ? (
                          <label className="w-full text-center cursor-pointer bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                            Upload a video file
                            <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                          </label>
                      ) : null}

                  </div>
              </div>


              <div className="pt-2">
                <h3 className="text-lg font-semibold border-b border-slate-300 dark:border-slate-600 pb-2 mb-4">Quiz Builder</h3>
                <div className="space-y-6">
                    {quiz.map((q, qIndex) => (
                        <div key={qIndex} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Question {qIndex + 1}</label>
                                <button type="button" onClick={() => removeQuestion(qIndex)} className="p-1 text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4"/></button>
                            </div>
                            <input type="text" placeholder="Question text" value={q.question} onChange={e => handleQuizChange(qIndex, 'question', e.target.value)} className="w-full mb-3 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"/>
                            <div className="space-y-2">
                                {q.options.map((opt, oIndex) => (
                                    <div key={oIndex} className="flex items-center gap-2">
                                        <input type="radio" name={`correct_q${qIndex}`} checked={q.correctAnswerIndex === oIndex} onChange={() => handleQuizChange(qIndex, 'correctAnswerIndex', oIndex)} className="form-radio h-4 w-4 text-brand-600 dark:text-brand-500 focus:ring-brand-500 dark:focus:ring-brand-600 dark:bg-slate-800 dark:border-slate-600" />
                                        <input type="text" placeholder={`Option ${oIndex + 1}`} value={opt} onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)} className="flex-grow px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" />
                                        <button type="button" onClick={() => removeOption(qIndex, oIndex)} disabled={q.options.length <= 2} className="p-1 text-red-500 hover:text-red-700 disabled:text-slate-400 disabled:cursor-not-allowed"><TrashIcon className="h-4 w-4"/></button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={() => addOption(qIndex)} disabled={q.options.length >= 4} className="mt-3 text-sm text-brand-600 hover:text-brand-800 disabled:text-slate-400 flex items-center gap-1">
                                <PlusCircleIcon className="h-4 w-4" /> Add Option
                            </button>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={addQuestion} className="mt-4 flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600"><PlusCircleIcon className="h-5 w-5"/>Add Question</button>
              </div>
            </div>

            <div className="flex-shrink-0 pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                {error && <p className="text-sm text-red-600 mb-4 text-center">{error}</p>}
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700">{lesson ? 'Save Changes' : 'Create Lesson'}</button>
                </div>
            </div>
        </form>
      </div>
    </div>
  );
};

export default LessonEditor;
