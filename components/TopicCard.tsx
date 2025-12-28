
import React from 'react';

interface TopicCardProps {
  name: string;
  description: string;
  icon: string;
  color: string;
  onClick: () => void;
}

export const TopicCard: React.FC<TopicCardProps> = ({ name, description, icon, color, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="group relative bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all text-left flex flex-col gap-2 md:gap-4 overflow-hidden h-full"
    >
      <div className={`w-9 h-9 md:w-12 md:h-12 rounded-xl ${color} flex items-center justify-center text-xl md:text-2xl shadow-inner text-white shrink-0`}>
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-sm md:text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">{name}</h3>
        <p className="text-[10px] md:text-sm text-slate-500 mt-1 leading-relaxed line-clamp-2 md:line-clamp-none">{description}</p>
      </div>
      <div className="mt-auto flex items-center text-[10px] md:text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
        Start Practice →
      </div>
      <div className="absolute -right-2 -bottom-2 opacity-5 scale-125 md:scale-150 transform group-hover:scale-150 transition-transform hidden sm:block">
        <span className="text-6xl">{icon}</span>
      </div>
    </button>
  );
};
