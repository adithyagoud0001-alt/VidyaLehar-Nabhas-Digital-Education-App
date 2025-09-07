import React from 'react';

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactElement<any>;
  colorIndex: number;
  onClick: () => void;
}

const colors = [
    'from-brand-500 to-brand-600',
    'from-emerald-500 to-emerald-600',
    'from-sky-500 to-sky-600',
    'from-indigo-500 to-indigo-600',
    'from-rose-500 to-rose-600',
];

const focusColors = [
    'focus:ring-brand-400',
    'focus:ring-emerald-400',
    'focus:ring-sky-400',
    'focus:ring-indigo-400',
    'focus:ring-rose-400',
];

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, icon, colorIndex, onClick }) => {
  const colorClass = colors[colorIndex % colors.length];
  const focusClass = focusColors[colorIndex % colors.length];

  return (
    <button
      onClick={onClick}
      className={`relative group p-6 w-full text-left rounded-xl shadow-lg overflow-hidden bg-gradient-to-br ${colorClass} text-white transition-all duration-300 transform hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${focusClass}`}
    >
        <div className="relative z-10">
            <div className="mb-4">
                {icon}
            </div>
            <h3 className="text-2xl font-bold mb-1">{title}</h3>
            <p className="text-sm opacity-90">{description}</p>
        </div>
         <div className="absolute -bottom-8 -right-8 text-white/10 group-hover:scale-125 transition-transform duration-500">
            {React.cloneElement(icon, { className: "h-32 w-32" })}
        </div>
    </button>
  );
};

export default DashboardCard;