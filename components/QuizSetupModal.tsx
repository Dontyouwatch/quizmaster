
import React, { useState } from 'react';
import { Difficulty } from '../types';

interface QuizSetupModalProps {
  topic: string;
  difficulty: Difficulty;
  onClose: () => void;
  onStart: (count: number) => void;
}

export const QuizSetupModal: React.FC<QuizSetupModalProps> = ({ topic, difficulty, onClose, onStart }) => {
  const [count, setCount] = useState(15);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-reveal">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800">Quiz Setup</h3>
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-8">
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">
                📚
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest leading-none mb-1">Topic Selected</p>
                <p className="text-sm font-bold text-slate-800">{topic}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Questions Count</span>
                <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold">
                  {count} Questions
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-slate-300">5</span>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all"
                  />
                  <span className="text-[10px] font-bold text-slate-300">50</span>
                </div>
                <p className="text-center text-[10px] text-slate-400 font-medium italic">
                  Dynamic difficulty: <span className="text-blue-600 font-bold">{difficulty}</span> mode active
                </p>
              </div>
            </div>

            <button
              onClick={() => onStart(count)}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98] flex items-center justify-center"
            >
              Start Practice Session →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
