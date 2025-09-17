import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Course, Lesson, Student, Teacher } from '../types';
import Quiz from './Quiz';
import TranscriptViewer from './TranscriptViewer';
import { useTranslation } from '../hooks/useTranslation';
import { 
  updateQuizProgress, 
  getDownloadedLessons, 
  downloadLesson, 
  removeDownloadedLesson,
  getVideo,
  getStudentProgress,
} from '../services/offlineContentService';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';
import { StopCircleIcon } from './icons/StopCircleIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { UserRole } from '../constants';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import AITutor from './AITutor';

interface LessonViewProps {
  course: Course;
  lesson: Lesson;
  user: Student | Teacher;
  onSelectLesson: (lesson: Lesson) => void;
  onBack: () => void;
  isOnline: boolean;
}

// Helper to convert YouTube URL to an embeddable URL
const getYouTubeEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
};


const LessonView: React.FC<LessonViewProps> = ({ course, lesson, user, onSelectLesson, onBack, isOnline }) => {
  const { t } = useTranslation();
  const difficultyStyles: Record<'Easy' | 'Medium' | 'Hard', string> = {
    Easy: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    Hard: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  };

  const getDifficultyTranslation = (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    switch (difficulty) {
      case 'Easy':
        return t('difficulty_easy');
      case 'Medium':
        return t('difficulty_medium');
      case 'Hard':
        return t('difficulty_hard');
    }
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const { speak, cancel, isSpeaking, supported } = useSpeechSynthesis();

  const [downloadedLessons, setDownloadedLessons] = useState<Set<string>>(new Set());
  const [downloadingLessons, setDownloadingLessons] = useState<Set<string>>(new Set());
  const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState<string | null>(null);
  const [lessonPerformance, setLessonPerformance] = useState<{ attempts: number; bestScore: number; } | null>(null);

  useEffect(() => {
    setDownloadedLessons(new Set(getDownloadedLessons()));
  }, []);

  useEffect(() => {
    let objectUrl: string | undefined;

    const setupVideo = async () => {
      setVideoSrc(undefined);
      setYoutubeEmbedUrl(null);

      // Prioritize teacher-uploaded offline video
      if (lesson.hasOfflineVideo) {
          try {
              const videoBlob = await getVideo(lesson.id);
              if (videoBlob) {
                  objectUrl = URL.createObjectURL(videoBlob);
                  setVideoSrc(objectUrl);
              } else {
                  console.error("Offline video blob not found in DB for lesson:", lesson.id);
              }
          } catch (error) {
              console.error("Error loading offline video from DB:", error);
          }
          return;
      }

      // Fallback to URL-based video logic
      if (lesson.videoUrl) {
          const embedUrl = getYouTubeEmbedUrl(lesson.videoUrl);
          if (embedUrl) {
              if (isOnline) {
                  setYoutubeEmbedUrl(embedUrl);
              }
              // YouTube videos can't be played offline or downloaded, so we stop here.
              return;
          }

          // It's a non-YouTube URL, proceed with download/streaming logic
          const isDownloadedByStudent = downloadedLessons.has(lesson.id);
          if (isDownloadedByStudent) {
              try {
                  const videoBlob = await getVideo(lesson.id);
                  if (videoBlob) {
                      objectUrl = URL.createObjectURL(videoBlob);
                      setVideoSrc(objectUrl);
                  } else if (isOnline) {
                      setVideoSrc(lesson.videoUrl);
                  }
              } catch (error) {
                  console.error("Error loading downloaded video from DB:", error);
                  if (isOnline) setVideoSrc(lesson.videoUrl);
              }
          } else if (isOnline) {
              setVideoSrc(lesson.videoUrl);
          }
      }
    };

    setupVideo();

    return () => {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
    };
  }, [lesson, isOnline, downloadedLessons]);

  useEffect(() => {
    const fetchPerformance = async () => {
      if (user.role === UserRole.STUDENT) {
          const allProgress = await getStudentProgress();
          const studentProgress = allProgress.find(p => p.studentId === user.id);
          if (studentProgress) {
              const courseProgress = studentProgress.courseProgress.find(cp => cp.courseId === course.id);
              const lessonStatus = courseProgress?.lessonStatus.find(ls => ls.lessonId === lesson.id);
              if (lessonStatus) {
                  setLessonPerformance({
                      attempts: lessonStatus.attempts,
                      bestScore: lessonStatus.finalScore
                  });
              } else {
                  setLessonPerformance(null);
              }
          } else {
            setLessonPerformance(null);
          }
      } else {
        setLessonPerformance(null);
      }
    };
    fetchPerformance();
  }, [user, course.id, lesson.id]);


  useEffect(() => {
    return () => {
      cancel();
    };
  }, [lesson, cancel]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleQuizComplete = (score: number) => {
    if (user.role === UserRole.STUDENT) {
      updateQuizProgress(user.id, (user as Student).name, course.id, lesson.id, score);
    }
  };
  
  const handleToggleSpeech = () => {
    if (isSpeaking) {
      cancel();
    } else {
      speak(lesson.content);
    }
  };

  const handleDownload = async (lessonToDownload: Lesson) => {
    if (!isOnline) return;
    setDownloadingLessons(prev => new Set(prev).add(lessonToDownload.id));
    try {
        await downloadLesson(lessonToDownload);
        setDownloadedLessons(prev => new Set(prev).add(lessonToDownload.id));
    } catch (error) {
        alert(t('download_failed'));
        console.error("Download failed in component:", error);
    } finally {
        setDownloadingLessons(prev => {
            const newSet = new Set(prev);
            newSet.delete(lessonToDownload.id);
            return newSet;
        });
    }
  };

  const handleDelete = async (lessonId: string) => {
      try {
          await removeDownloadedLesson(lessonId);
          setDownloadedLessons(prev => {
              const newSet = new Set(prev);
              newSet.delete(lessonId);
              return newSet;
          });
      } catch (error) {
          console.error("Delete failed in component:", error);
      }
  };


  return (
    <div className="max-w-7xl mx-auto">
      <button onClick={onBack} className="mb-6 text-sm font-semibold text-brand-700 dark:text-brand-400 hover:underline">
        &larr; {t('back_to_dashboard')}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <aside className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md self-start">
          <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{course.title}</h3>
          <ul className="space-y-1">
            {course.lessons.map((l) => {
              const isYouTube = l.videoUrl ? getYouTubeEmbedUrl(l.videoUrl) !== null : false;
              const isDownloading = downloadingLessons.has(l.id);
              const isDownloaded = downloadedLessons.has(l.id);
              return (
              <li key={l.id} className="flex items-center group">
                <button
                  onClick={() => onSelectLesson(l)}
                  className={`w-full text-left px-4 py-3 rounded-md transition ${
                    l.id === lesson.id
                      ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-800 dark:text-brand-300 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{l.title}</span>
                    {l.difficulty && (
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${difficultyStyles[l.difficulty]}`}>
                            {getDifficultyTranslation(l.difficulty)}
                        </span>
                    )}
                  </div>
                </button>
                {user.role === UserRole.STUDENT && l.videoUrl && !isYouTube && (
                  <div className="flex-shrink-0 ml-2">
                    {isDownloaded ? (
                        <button
                            onClick={() => handleDelete(l.id)}
                            title={t('delete_download')}
                            aria-label={t('delete_download')}
                            className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 opacity-50 group-hover:opacity-100 transition-opacity"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    ) : (
                        <button
                            onClick={() => handleDownload(l)}
                            disabled={!isOnline || isDownloading}
                            title={isDownloading ? t('downloading') : (isOnline ? t('download_lesson') : t('download_disabled_offline'))}
                            aria-label={isDownloading ? t('downloading') : (isOnline ? t('download_lesson') : t('download_disabled_offline'))}
                            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isDownloading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-500" />
                            ) : (
                                <DownloadIcon className="h-5 w-5" />
                            )}
                        </button>
                    )}
                  </div>
                )}
              </li>
            )})}
          </ul>
        </aside>

        <main className="lg:col-span-2 space-y-8">
          {lesson.summary && (
            <div className="bg-brand-50 dark:bg-brand-900/30 p-5 rounded-lg border border-brand-200 dark:border-brand-800">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    <InformationCircleIcon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-brand-800 dark:text-brand-200 mb-1">{t('key_takeaways')}</h3>
                    <p className="text-brand-700 dark:text-brand-300/90 text-sm">{lesson.summary}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-lg shadow-md">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 mr-4">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{lesson.title}</h2>
                    {lesson.difficulty && (
                        <div className="mt-2 flex items-center">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 mr-2">{t('difficulty')}:</span>
                            <span className={`inline-block px-2.5 py-0.5 text-sm font-semibold rounded-full ${difficultyStyles[lesson.difficulty]}`}>
                                {getDifficultyTranslation(lesson.difficulty)}
                            </span>
                        </div>
                    )}
                </div>
                {supported && lesson.content && (
                    <button 
                        onClick={handleToggleSpeech} 
                        className="flex-shrink-0 ml-4 flex items-center space-x-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600"
                        title={isSpeaking ? t('stop_listening') : t('listen_to_lesson')}
                    >
                        {isSpeaking ? (
                            <>
                                <StopCircleIcon className="h-5 w-5 text-red-500" />
                                <span className="hidden sm:inline">{t('stop_listening')}</span>
                            </>
                        ) : (
                             <>
                                <SpeakerWaveIcon className="h-5 w-5" />
                                <span className="hidden sm:inline">{t('listen_to_lesson')}</span>
                            </>
                        )}
                    </button>
                )}
            </div>
            
            {(lesson.videoUrl || lesson.hasOfflineVideo) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                          {youtubeEmbedUrl ? (
                            <iframe
                              className="w-full h-full"
                              src={youtubeEmbedUrl}
                              title="YouTube video player"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            ></iframe>
                          ) : videoSrc ? (
                            <video
                                key={videoSrc}
                                ref={videoRef}
                                controls
                                className="w-full h-full"
                                onTimeUpdate={handleTimeUpdate}
                                src={videoSrc}
                            />
                           ) : (
                            <div className="text-center text-slate-400 p-4">
                                <p>{t('video_offline_placeholder')}</p>
                            </div>
                           )}
                        </div>
                         <div className="text-slate-600 dark:text-slate-400 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: lesson.content }} />
                    </div>
                    {lesson.transcript && <TranscriptViewer transcript={lesson.transcript} currentTime={currentTime} />}
                </div>
            ) : (
                 <div className="text-slate-600 dark:text-slate-400 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: lesson.content }} />
            )}

          </div>

          {lesson.quiz && lesson.quiz.length > 0 && user.role === UserRole.STUDENT && (
            <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-lg shadow-md">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t('check_your_understanding')}</h3>
              <Quiz questions={lesson.quiz} onQuizComplete={handleQuizComplete} />
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-lg shadow-md">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t('need_help_ask_ai_tutor')}</h3>
            <AITutor
              lessonContext={lesson.content}
              isOnline={isOnline}
              lessonTitle={lesson.title}
              user={user}
              performanceContext={lessonPerformance}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default LessonView;