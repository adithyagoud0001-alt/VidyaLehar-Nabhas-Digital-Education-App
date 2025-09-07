import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  return (
    <div className="relative flex items-center group">
      {children}
      <div 
        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-800 dark:bg-slate-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50"
        role="tooltip"
      >
        {text}
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800 dark:border-t-slate-900"></div>
      </div>
    </div>
  );
};

export default Tooltip;
