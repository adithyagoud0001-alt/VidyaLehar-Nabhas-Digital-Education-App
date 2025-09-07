import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmButtonText, cancelButtonText }) => {
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
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 transform transition-transform duration-300 scale-95"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fade-in-up 0.3s ease-out forwards' }}
      >
        <div className="flex items-start">
            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 sm:h-12 sm:w-12">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4 text-left">
                 <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100" id="modal-title">
                    {title}
                </h3>
                <div className="mt-2">
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                        {message}
                    </div>
                </div>
            </div>
        </div>
       
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4 space-y-2 space-y-reverse sm:space-y-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2 bg-slate-100 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-slate-400 transition"
            >
              {cancelButtonText || t('cancel') || 'Cancel'}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="w-full sm:w-auto px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-red-500 transition"
            >
              {confirmButtonText || t('delete') || 'Delete'}
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

export default ConfirmationModal;
