
import React, { useState } from 'react';
import { Difficulty } from '../types';

interface CustomTopicCardProps {
  onStart: (topic: string, difficulty: Difficulty) => void;
  isLoading: boolean;
}

export const CustomTopicCard: React.FC<CustomTopicCardProps> = ({ onStart, isLoading }) => {
  const [input, setInput] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onStart(input.trim(), difficulty);
    }
  };

  const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard'];

  return (
    <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-700 p-8 text-white shadow-xl shadow-indigo-200">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="max-w-md">
            <h3 className="text-2xl font-bold mb-2">Create Custom Quiz 🪄</h3>
            <p className="text-indigo-100 text-sm leading-relaxed">
              Want to test something specific? Type any pharmaceutical topic and select a difficulty level.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. Mechanism of Action of ACE Inhibitors..."
                className="flex-1 w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-4 text-white placeholder:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-inner"
                required
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-full md:w-auto bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50 shadow-lg"
              >
                {isLoading ? 'Generating...' : 'Create MCQ'}
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Select Difficulty</span>
              <div className="flex flex-wrap gap-2">
                {difficulties.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={`px-6 py-2 rounded-full text-xs font-bold transition-all border ${
                      difficulty === level 
                        ? 'bg-white text-indigo-600 border-white shadow-md scale-105' 
                        : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
};
