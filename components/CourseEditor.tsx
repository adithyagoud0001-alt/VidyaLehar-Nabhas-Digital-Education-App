import React, { useState, useEffect } from 'react';
import type { Course } from '../types';
import { saveCourse } from '../services/offlineContentService';

interface CourseEditorProps {
  course: Course | null;
  teacherId: string;
  teacherClass: number;
  onSave: () => void;
  onCancel: () => void;
}

const CourseEditor: React.FC<CourseEditorProps> = ({ course, teacherId, teacherClass, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<'Book' | 'Computer' | 'Calculator'>('Book');
  const [error, setError] = useState('');

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description);
      setIcon(course.icon);
    } else {
      setTitle('');
      setDescription('');
      setIcon('Book');
    }
  }, [course]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
        setError('Title and description cannot be empty.');
        return;
    }
    setError('');

    const courseData = {
      id: course?.id,
      title,
      description,
      icon,
      forClass: course?.forClass || teacherClass,
    };

    try {
        saveCourse(courseData, teacherId);
        onSave();
    } catch (err: any) {
        setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-30 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 animate-fade-in-up">
        <h2 className="text-2xl font-bold mb-4">{course ? 'Edit Course' : 'Create New Course'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
              required
            />
          </div>
          <div>
            <label htmlFor="icon" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Icon</label>
            <select
              id="icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value as 'Book' | 'Computer' | 'Calculator')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
            >
              <option>Book</option>
              <option>Computer</option>
              <option>Calculator</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
            >
              {course ? 'Save Changes' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseEditor;
