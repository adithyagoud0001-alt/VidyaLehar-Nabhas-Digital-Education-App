import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { XMarkIcon } from './icons/XMarkIcon';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl p-6 sm:p-8 transform transition-transform duration-300 scale-95"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        style={{ animation: 'fade-in-up 0.3s ease-out forwards' }}
      >
        <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-brand-700 dark:text-brand-400">{t('about_vidyalehar')}</h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label={t('close')}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="mt-6 space-y-6 text-slate-600 dark:text-slate-300 max-h-[70vh] overflow-y-auto pr-2">
            <section>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('our_mission')}</h3>
                <p>{t('mission_statement')}</p>
            </section>
            
            <section>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('what_we_offer')}</h3>
                <ul className="list-disc list-inside space-y-2">
                    <li>{t('offer_1')}</li>
                    <li>{t('offer_2')}</li>
                    <li>{t('offer_3')}</li>
                    <li>{t('offer_4')}</li>
                </ul>
            </section>
            
            <section>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('our_impact')}</h3>
                <p>{t('impact_statement')}</p>
            </section>
        </div>
        
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
            >
              {t('close')}
            </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default AboutModal;
