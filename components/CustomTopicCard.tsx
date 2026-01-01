
import React, { useState } from 'react';
import { Difficulty } from '../types';

interface CustomTopicCardProps {
  onStart: (topic: string, count: number, difficulty: Difficulty) => void;
  isLoading: boolean;
}

export const CustomTopicCard: React.FC<CustomTopicCardProps> = ({ onStart, isLoading }) => {
  const [input, setInput] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [count, setCount] = useState(15);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onStart(input.trim(), count, difficulty);
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
              Want to test something specific? Type any pharmaceutical topic and fine-tune your session.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={input}
                onFocus={() => setIsFocused(true)}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. Mechanism of Action of ACE Inhibitors..."
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-4 text-white placeholder:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-inner"
                required
              />
            </div>

            {(isFocused || input.length > 0) && (
              <div className="space-y-8 animate-reveal">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Question Slider */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Question Count</span>
                      <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-bold text-white border border-white/10">
                        You will attempt <span className="text-indigo-200">{count}</span> questions
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-indigo-300">5</span>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        step="5"
                        value={count}
                        onChange={(e) => setCount(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white hover:accent-indigo-100 transition-all"
                      />
                      <span className="text-[10px] font-bold text-indigo-300">50</span>
                    </div>
                  </div>

                  {/* Difficulty Selector */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Select Difficulty</span>
                    <div className="flex flex-wrap gap-2">
                      {difficulties.map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setDifficulty(level)}
                          className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            difficulty === level 
                              ? 'bg-white text-indigo-600 border-white shadow-md' 
                              : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="w-full bg-white text-indigo-600 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : 'Create MCQ Quiz'}
                </button>
              </div>
            )}
          </form>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
};
