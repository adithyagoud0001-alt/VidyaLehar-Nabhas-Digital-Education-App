import React, { useState, useEffect, useRef } from 'react';
// Fix: Import SearchResult from types.ts and separate it from the function import.
import type { User, SearchResult } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { LanguageIcon } from './icons/LanguageIcon';
import { SearchIcon } from './icons/SearchIcon';
import { searchContent } from '../services/offlineContentService';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import AboutModal from './AboutModal';

interface HeaderProps {
  user: User & { name: string };
  isOnline: boolean;
  onLogout: () => void;
  onSearchSelect: (result: SearchResult) => void;
}

const Header: React.FC<HeaderProps> = ({ user, isOnline, onLogout, onSearchSelect }) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length > 1) {
          const results = await searchContent(searchQuery);
          setSearchResults(results);
          setIsDropdownOpen(results.length > 0);
      } else {
          setSearchResults([]);
          setIsDropdownOpen(false);
      }
    };
    performSearch();
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
            setIsDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleResultClick = (result: SearchResult) => {
    onSearchSelect(result);
    setSearchQuery('');
    setSearchResults([]);
    setIsDropdownOpen(false);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as 'en' | 'pa');
  };

  return (
    <>
      <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-brand-700 dark:text-brand-400">VidyaLehar</h1>
               <div className="relative hidden md:block" ref={searchRef}>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SearchIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                      type="text"
                      placeholder="Search courses & lessons..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchQuery.trim().length > 1 && setIsDropdownOpen(true)}
                      className="block w-64 lg:w-80 pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md leading-5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:placeholder-slate-400 dark:focus:placeholder-slate-500 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  />
                  {isDropdownOpen && searchResults.length > 0 && (
                      <div className="absolute mt-1 w-96 max-h-96 overflow-y-auto rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <ul className="py-1">
                              {searchResults.map((result, index) => (
                                  <li key={`${result.type}-${result.title}-${index}`}>
                                      <button
                                          onClick={() => handleResultClick(result)}
                                          className="w-full text-left flex items-start px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                      >
                                          <div className="flex-shrink-0 mr-3 mt-1">
                                              {result.type === 'course' ? <SparklesIcon className="h-5 w-5 text-brand-500" /> : <BookOpenIcon className="h-5 w-5 text-indigo-500" />}
                                          </div>
                                          <div>
                                              <p className="font-semibold">{result.title}</p>
                                              <p className="text-xs text-slate-500 dark:text-slate-400">{result.context}</p>
                                          </div>
                                      </button>
                                  </li>
                              ))}
                          </ul>
                      </div>
                  )}
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
               <div className="flex items-center space-x-2">
                  <span 
                      className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}
                      title={isOnline ? t('online') : t('offline_mode')}
                  ></span>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden sm:block">{isOnline ? t('online') : t('offline_mode')}</span>
              </div>
               <div className="relative">
                  <LanguageIcon className="h-5 w-5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500"/>
                  <select
                      value={language}
                      onChange={handleLanguageChange}
                      className="pl-8 pr-2 py-1 text-sm bg-slate-100 dark:bg-slate-700 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none"
                      aria-label="Select language"
                  >
                      <option value="en">EN</option>
                      <option value="pa">PA</option>
                  </select>
               </div>
              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300" aria-label="Toggle theme">
                {theme === 'dark' ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
              </button>
              <button onClick={() => setIsAboutModalOpen(true)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300" aria-label={t('about')}>
                <InformationCircleIcon className="h-6 w-6" />
              </button>
              <span className="hidden sm:inline-block px-3 py-1 text-sm font-semibold text-brand-800 bg-brand-100 dark:bg-brand-900/50 dark:text-brand-300 rounded-full">
                {user.role}
              </span>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-600 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition"
              >
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      </header>
      <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
    </>
  );
};

export default Header;