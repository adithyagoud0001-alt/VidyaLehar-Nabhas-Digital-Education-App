import React from 'react';
import type { TranscriptEntry } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface TranscriptViewerProps {
  transcript: TranscriptEntry[];
  currentTime: number;
}

const TranscriptViewer: React.FC<TranscriptViewerProps> = ({ transcript, currentTime }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg h-96 overflow-y-auto">
      <h4 className="font-bold text-lg mb-3 text-slate-700 dark:text-slate-200 sticky top-0 bg-slate-50 dark:bg-slate-700/50 py-2">{t('transcript')}</h4>
      <div className="space-y-4">
        {transcript.map((entry, index) => {
          const isActive = currentTime >= entry.start && currentTime <= entry.end;
          return (
            <p
              key={index}
              className={`transition-colors duration-200 ${
                isActive 
                ? 'text-brand-700 dark:text-brand-400 font-semibold' 
                : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {entry.text}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default TranscriptViewer;