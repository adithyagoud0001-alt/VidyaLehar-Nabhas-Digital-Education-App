import React, { useState } from 'react';
import { UserRole } from '../constants';
import type { User } from '../types';
import { login, register } from '../services/authService';
import { useTranslation } from '../hooks/useTranslation';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { UsersIcon } from './icons/UsersIcon';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

const images = [
    'https://storage.googleapis.com/aistudio-hosting/generative-ai/e4a11c3a-2a1c-4393-94c6-2c93d9e4e6b5/image.jpeg',
    'https://images.yourstory.com/cs/wordpress/2016/06/yourstory-education-in-rural-india.jpg',
];

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [classNumber, setClassNumber] = useState<number | undefined>(undefined);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (isRegistering && !classNumber) {
        setError(t('select_class_error'));
        setIsLoading(false);
        return;
    }

    try {
      let user;
      if (isRegistering) {
        user = await register(username, password, role, classNumber);
      } else {
        user = await login(username, password);
      }
      onLogin(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="isolate">
        <div className="slideshow">
            {images.map((img, index) => (
                <div key={index} className="slideshow_image" style={{ backgroundImage: `url(${img})` }}></div>
            ))}
        </div>
        <div className="flex flex-col items-center justify-center min-h-[100vh]">
          <div className="text-center mb-10" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.7)' }}>
            <h1 className="text-4xl sm:text-5xl font-bold text-brand-200">
              {t('welcome_to_vidyalehar')}
            </h1>
            <p className="text-lg mt-2 text-brand-100/90">
              {t('nabhas_digital_classroom')}
            </p>
          </div>
          <div className="bg-white/95 dark:bg-slate-800/90 backdrop-blur-lg p-8 rounded-xl shadow-lg w-full max-w-sm border dark:border-slate-700">
            <h2 className="text-2xl font-semibold text-center text-slate-800 dark:text-slate-100 mb-6">
              {isRegistering ? t('create_an_account') : t('login_to_your_account')}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="username">{t('username')}</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md focus:ring-2 focus:ring-brand-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="password">{t('password')}</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md focus:ring-2 focus:ring-brand-400 focus:outline-none"
                />
              </div>

              {isRegistering && (
                <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('choose_your_role')}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setRole(UserRole.STUDENT)} className={`flex flex-col items-center p-3 rounded-lg border-2 transition ${role === UserRole.STUDENT ? 'border-brand-500 bg-brand-100 dark:bg-brand-900/60' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700'}`}>
                          <BookOpenIcon className="h-8 w-8 text-brand-600 dark:text-brand-400"/>
                          <span className="mt-1 font-semibold">{t('student')}</span>
                        </button>
                        <button type="button" onClick={() => setRole(UserRole.TEACHER)} className={`flex flex-col items-center p-3 rounded-lg border-2 transition ${role === UserRole.TEACHER ? 'border-brand-500 bg-brand-100 dark:bg-brand-900/60' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700'}`}>
                          <UsersIcon className="h-8 w-8 text-brand-600 dark:text-brand-400"/>
                          <span className="mt-1 font-semibold">{t('teacher')}</span>
                        </button>
                      </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="class">
                            {role === UserRole.STUDENT ? t('class') : t('teaching_class')}
                        </label>
                        <select
                            id="class"
                            value={classNumber || ''}
                            onChange={(e) => setClassNumber(Number(e.target.value))}
                            required
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md focus:ring-2 focus:ring-brand-400 focus:outline-none"
                        >
                            <option value="" disabled>{role === UserRole.STUDENT ? t('select_your_class') : t('select_teaching_class')}</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </>
              )}

              {error && <p className="text-red-500 dark:text-red-400 text-sm text-center bg-red-100/50 dark:bg-red-900/50 p-2 rounded-md">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full p-3 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-300 transition disabled:bg-slate-400"
              >
                {isLoading ? '...' : (isRegistering ? t('register') : t('login'))}
              </button>
            </form>

            <p className="text-center text-sm text-slate-600 dark:text-slate-300 mt-6">
              {isRegistering ? t('already_have_account') : t('dont_have_account')}{' '}
              <button onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="font-semibold text-brand-700 dark:text-brand-400 hover:underline">
                {isRegistering ? t('login_now') : t('register_now')}
              </button>
            </p>
          </div>
        </div>
    </div>
  );
};

export default AuthScreen;
