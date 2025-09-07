import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import type { Student, StudentProgress, LessonStatus, Teacher, Course, Lesson } from '../types';
import { getStudentProgress, getCoursesForClass, getCoursesByAuthor, deleteCourse, deleteLesson } from '../services/offlineContentService';
import { getStudentsByClass } from '../services/authService';
import { useTranslation } from '../hooks/useTranslation';
import { SearchIcon } from './icons/SearchIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import CourseEditor from './CourseEditor';
import LessonEditor from './LessonEditor';
import Tooltip from './Tooltip';
import ConfirmationModal from './ConfirmationModal';


const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface TeacherDashboardProps {
  user: Teacher;
}

type TeacherTab = 'analytics' | 'content';

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [progressData, setProgressData] = useState<StudentProgress[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TeacherTab>('analytics');
    const { t } = useTranslation();

    // Content Management State
    const [managedCourses, setManagedCourses] = useState<Course[]>([]);
    const [isCourseEditorOpen, setIsCourseEditorOpen] = useState(false);
    const [isLessonEditorOpen, setIsLessonEditorOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [courseForLesson, setCourseForLesson] = useState<Course | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
    
    const refetchManagedCourses = useCallback(() => {
        setManagedCourses(getCoursesByAuthor(user.id).filter(c => c.forClass === user.class));
    }, [user.id, user.class]);

    const refetchProgressData = useCallback(() => {
        const studentList = getStudentsByClass(user.class);
        const allStudentProgress = getStudentProgress();
        const studentIdsInClass = new Set(studentList.map(s => s.id));
        const studentProgressForClass = allStudentProgress.filter(p => studentIdsInClass.has(p.studentId));
        setProgressData(studentProgressForClass);
    }, [user.class]);

    // Fetch all data on mount
    useEffect(() => {
        const studentList = getStudentsByClass(user.class);
        setStudents(studentList);
        refetchProgressData();
        
        if (studentList.length > 0) {
            setSelectedStudentId(studentList[0].id); // Select first student by default
        }
        refetchManagedCourses();
    }, [user.id, user.class, refetchManagedCourses, refetchProgressData]);


    // --- Analytics Memoized Data ---
    const coursesForClass = useMemo(() => getCoursesForClass(user.class), [user.class]);
    const allLessonsForClass = useMemo(() => coursesForClass.flatMap(course => course.lessons), [coursesForClass]);

    const mergedStudentData = useMemo(() => {
        return students.map(student => {
            const progress = progressData.find(p => p.studentId === student.id);
            return { ...student, progress };
        });
    }, [students, progressData]);

    const filteredStudentData = useMemo(() => {
        if (!studentSearchQuery) return mergedStudentData;
        const lowercasedQuery = studentSearchQuery.toLowerCase();
        return mergedStudentData.filter(student => student.name.toLowerCase().includes(lowercasedQuery));
    }, [mergedStudentData, studentSearchQuery]);
    
    useEffect(() => {
        if (filteredStudentData.length > 0 && !filteredStudentData.some(s => s.id === selectedStudentId)) {
            setSelectedStudentId(filteredStudentData[0].id);
        } else if (filteredStudentData.length === 0) {
            setSelectedStudentId('');
        }
    }, [filteredStudentData, selectedStudentId]);

    const overallPerformanceData = useMemo(() => coursesForClass.map(course => {
        const relevantProgress = progressData.flatMap(p => p.courseProgress.filter(cp => cp.courseId === course.id));
        const avgScore = relevantProgress.length > 0
            ? relevantProgress.reduce((sum, item) => sum + item.score, 0) / relevantProgress.length
            : 0;
        return { name: course.title, [t('avg_score_percent')]: avgScore };
    }), [coursesForClass, progressData, t]);

    const completionData = useMemo(() => coursesForClass.map(course => {
        const relevantProgress = progressData.flatMap(p => p.courseProgress.filter(cp => cp.courseId === course.id));
        const totalCompleted = relevantProgress.reduce((sum, item) => sum + item.completedLessons, 0);
        const totalLessons = relevantProgress.reduce((sum, item) => sum + item.totalLessons, 0);
        const completionRate = totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0;
        return { name: course.title, value: completionRate };
    }).filter(d => d.value > 0), [coursesForClass, progressData]);
    
    const selectedStudentProgress = useMemo(() => progressData.find(p => p.studentId === selectedStudentId), [progressData, selectedStudentId]);
    
    const getHeatmapColor = (status: LessonStatus | undefined) => {
        if (!status || status.attempts === 0) return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300';
        if (status.attempts === 1) return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300';
        return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300';
    };

    // --- Content Management Handlers ---
    const handleCreateCourse = () => {
        setEditingCourse(null);
        setIsCourseEditorOpen(true);
    };

    const handleEditCourse = (course: Course) => {
        setEditingCourse(course);
        setIsCourseEditorOpen(true);
    };

    const handleOpenDeleteModal = (course: Course) => {
        setCourseToDelete(course);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (courseToDelete) {
            deleteCourse(courseToDelete.id);
            refetchManagedCourses();
            refetchProgressData();
        }
        setIsDeleteModalOpen(false);
        setCourseToDelete(null);
    };

    const handleCreateLesson = (course: Course) => {
        setCourseForLesson(course);
        setEditingLesson(null);
        setIsLessonEditorOpen(true);
    };

    const handleEditLesson = (course: Course, lesson: Lesson) => {
        setCourseForLesson(course);
        setEditingLesson(lesson);
        setIsLessonEditorOpen(true);
    };
    
    const handleDeleteLesson = (courseId: string, lessonId: string) => {
        if (window.confirm('Are you sure you want to delete this lesson?')) {
            deleteLesson(courseId, lessonId);
            refetchManagedCourses();
        }
    };

    const handleCloseEditors = () => {
        setIsCourseEditorOpen(false);
        setIsLessonEditorOpen(false);
        setEditingCourse(null);
        setEditingLesson(null);
        setCourseForLesson(null);
        refetchManagedCourses();
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">{t('teacher_dashboard')} - Class {user.class}</h2>
            
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button 
                        onClick={() => setActiveTab('analytics')}
                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'analytics' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    >
                        Student Analytics
                    </button>
                    <button 
                        onClick={() => setActiveTab('content')}
                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'content' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    >
                        Content Management
                    </button>
                </nav>
            </div>

            {activeTab === 'analytics' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                        <h3 className="font-bold text-lg mb-4 text-slate-700 dark:text-slate-200">{t('overall_class_performance')}</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={overallPerformanceData}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                                <XAxis dataKey="name" tick={{ fill: 'currentColor', opacity: 0.6 }}/>
                                <YAxis unit="%" tick={{ fill: 'currentColor', opacity: 0.6 }}/>
                                <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: 'none' }}/>
                                <Legend />
                                <Bar dataKey={t('avg_score_percent')} fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                        <h3 className="font-bold text-lg mb-4 text-slate-700 dark:text-slate-200">{t('course_completion_rate')}</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={completionData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {completionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip formatter={(value: number) => `${value.toFixed(2)}%`} contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: 'none' }}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                    <div className="relative max-w-sm mb-6">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder={t('search_students_placeholder')}
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md leading-5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:placeholder-slate-400 dark:focus:placeholder-slate-500 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                        />
                    </div>

                    <h3 className="font-bold text-lg mb-4 text-slate-700 dark:text-slate-200">{t('lesson_engagement_heatmap')}</h3>
                    <div className="flex space-x-4 mb-4 text-sm">
                        <div className="flex items-center"><span className="w-4 h-4 bg-green-100 dark:bg-green-900/40 mr-2 rounded"></span>{t('easy')}</div>
                        <div className="flex items-center"><span className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/40 mr-2 rounded"></span>{t('challenging')}</div>
                        <div className="flex items-center"><span className="w-4 h-4 bg-red-100 dark:bg-red-900/40 mr-2 rounded"></span>{t('not_started')}</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="sticky left-0 bg-slate-50 dark:bg-slate-700 z-10 p-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase border border-slate-200 dark:border-slate-600">{t('student')}</th>
                                    {allLessonsForClass.map(lesson => <th key={lesson.id} className="p-2 text-xs font-medium text-slate-600 dark:text-slate-300 uppercase border border-slate-200 dark:border-slate-600" title={lesson.title}>{lesson.title.split(' ')[0]}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudentData.map(student => {
                                    const lessonStatusMap = new Map(student.progress?.courseProgress.flatMap(cp => cp.lessonStatus).map(ls => [ls.lessonId, ls]));
                                    return (
                                        <tr key={student.id} className="even:bg-slate-50/50 dark:even:bg-slate-800/50">
                                            <td className="sticky left-0 bg-white dark:bg-slate-800 z-10 p-2 text-sm font-medium text-gray-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 whitespace-nowrap">{student.name}</td>
                                            {allLessonsForClass.map(lesson => {
                                                const status = lessonStatusMap.get(lesson.id);
                                                return (
                                                    <td key={lesson.id} className={`p-2 text-center border border-slate-200 dark:border-slate-600 text-xs font-semibold ${getHeatmapColor(status)}`} title={`${lesson.title}\nAttempts: ${status?.attempts ?? 0}`}>
                                                        {status && status.attempts > 0 ? `${status.finalScore}%` : 'N/A'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                 <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                        <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">{t('student_performance_trend')}</h3>
                        <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="mt-2 sm:mt-0 p-2 border rounded-md bg-slate-50 dark:bg-slate-700 dark:border-slate-600">
                             <option value="" disabled>Select a student</option>
                            {filteredStudentData.map(student => (
                                <option key={student.id} value={student.id}>{student.name}</option>
                            ))}
                        </select>
                    </div>
                    {selectedStudentProgress ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={selectedStudentProgress.scoreHistory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                                <XAxis dataKey="date" tick={{ fill: 'currentColor', opacity: 0.6 }}/>
                                <YAxis unit="%" domain={[0, 100]} tick={{ fill: 'currentColor', opacity: 0.6 }}/>
                                <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: 'none' }}/>
                                <Legend />
                                <Line type="monotone" dataKey="score" stroke="#82ca9d" strokeWidth={2} name={t('avg_score')} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : <p className="text-slate-500">{t('select_a_student_to_see_trend')}</p>}
                </div>

              </div>
            )}
            
            {activeTab === 'content' && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-xl text-slate-700 dark:text-slate-200">My Courses</h3>
                        <div className="flex items-center gap-2">
                           <Tooltip text={t('course_creation_tooltip')}>
                               <QuestionMarkCircleIcon className="h-5 w-5 text-slate-400 cursor-help" />
                           </Tooltip>
                            <button onClick={handleCreateCourse} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition">
                                <PlusCircleIcon className="h-5 w-5"/>
                                <span>Create Course</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {managedCourses.length > 0 ? managedCourses.map(course => (
                            <div key={course.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-lg">{course.title}</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{course.lessons.length} lessons</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleEditCourse(course)} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => handleOpenDeleteModal(course)} className="p-2 text-red-500 hover:text-red-700 transition"><TrashIcon className="h-5 w-5"/></button>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-semibold text-slate-600 dark:text-slate-300">Lessons</h5>
                                        <div className="flex items-center gap-2">
                                            <Tooltip text={t('lesson_creation_tooltip')}>
                                                <QuestionMarkCircleIcon className="h-4 w-4 text-slate-400 cursor-help" />
                                            </Tooltip>
                                            <button onClick={() => handleCreateLesson(course)} className="text-sm flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600">
                                                <PlusCircleIcon className="h-4 w-4"/> New Lesson
                                            </button>
                                        </div>
                                    </div>
                                    <ul className="space-y-2">
                                        {course.lessons.map(lesson => (
                                            <li key={lesson.id} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                                                <span>{lesson.title}</span>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleEditLesson(course, lesson)} className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"><PencilIcon className="h-4 w-4"/></button>
                                                    <button onClick={() => handleDeleteLesson(course.id, lesson.id)} className="p-1 text-red-500 hover:text-red-700 transition"><TrashIcon className="h-4 w-4"/></button>
                                                </div>
                                            </li>
                                        ))}
                                        {course.lessons.length === 0 && <p className="text-sm text-slate-400 text-center py-2">No lessons yet. Add one!</p>}
                                    </ul>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-slate-500 dark:text-slate-400 py-8">You haven't created any courses yet. Get started!</p>
                        )}
                    </div>
                </div>
            )}
            
            {isCourseEditorOpen && (
                <CourseEditor
                    course={editingCourse}
                    onSave={() => {
                        handleCloseEditors();
                    }}
                    onCancel={handleCloseEditors}
                    teacherId={user.id}
                    teacherClass={user.class}
                />
            )}

            {isLessonEditorOpen && courseForLesson && (
                <LessonEditor
                    lesson={editingLesson}
                    courseId={courseForLesson.id}
                    onSave={() => {
                        handleCloseEditors();
                    }}
                    onCancel={handleCloseEditors}
                />
            )}

            {isDeleteModalOpen && courseToDelete && (
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => {
                        setIsDeleteModalOpen(false);
                        setCourseToDelete(null);
                    }}
                    onConfirm={handleConfirmDelete}
                    title={t('delete_course')}
                    message={
                        <>
                            <p>{t('delete_course_confirmation')}</p>
                            <p className="font-semibold my-2 bg-slate-100 dark:bg-slate-700 p-2 rounded">{courseToDelete.title}</p>
                            <p>{t('delete_course_warning')}</p>
                        </>
                    }
                    confirmButtonText={t('delete')}
                    cancelButtonText={t('cancel')}
                />
            )}

        </div>
    );
};

export default TeacherDashboard;