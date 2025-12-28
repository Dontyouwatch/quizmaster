
import React, { useState, useMemo } from 'react';
import { Question } from '../types';
import { getDetailedExplanation, DeepDiveResponse } from '../services/geminiService';
import { marked } from 'marked';

interface QuizEngineProps {
  questions: Question[];
  onFinish: (answers: Record<string, number>) => void;
  onCancel: () => void;
  onExploreRelated: (topic: string) => void;
}

export const QuizEngine: React.FC<QuizEngineProps> = ({ questions, onFinish, onCancel, onExploreRelated }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [hasRequestedDetails, setHasRequestedDetails] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<DeepDiveResponse | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isLast = currentIndex === totalQuestions - 1;
  const isCorrect = selectedAnswers[currentQuestion.id] === currentQuestion.correctAnswer;

  const renderedAnalysis = useMemo(() => {
    if (!aiAnalysis) return '';
    return marked.parse(aiAnalysis.explanation);
  }, [aiAnalysis]);

  const handleSelect = (index: number) => {
    if (showFeedback) return;
    setSelectedAnswers(prev => ({ ...prev, [currentQuestion.id]: index }));
    setShowFeedback(true);
  };

  const handleRequestDeepDive = async () => {
    if (aiAnalysis || isLoadingAnalysis) {
      setHasRequestedDetails(true);
      return;
    }
    
    setIsLoadingAnalysis(true);
    setHasRequestedDetails(true);
    
    try {
      const selectedIdx = selectedAnswers[currentQuestion.id];
      const analysis = await getDetailedExplanation(
        currentQuestion.text,
        currentQuestion.options[selectedIdx],
        currentQuestion.options[currentQuestion.correctAnswer]
      );
      setAiAnalysis(analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const next = () => {
    if (isLast) {
      onFinish(selectedAnswers);
    } else {
      setCurrentIndex(prev => prev + 1);
      setShowFeedback(false);
      setHasRequestedDetails(false);
      setAiAnalysis(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-32">
      <div className="mb-8 flex items-center justify-between sticky top-[72px] bg-slate-50/90 backdrop-blur-sm z-30 py-2">
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-sm font-semibold flex items-center gap-1 transition-colors group">
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Exit
        </button>
        <div className="flex flex-col items-end">
          <div className="flex items-baseline gap-1">
             <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Question</span>
             <span className="text-lg font-black text-blue-600">{currentIndex + 1}</span>
             <span className="text-xs text-slate-400 font-bold">/ {totalQuestions}</span>
          </div>
          <div className="flex gap-0.5 mt-1">
            {questions.map((q, idx) => (
              <div 
                key={q.id} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'bg-blue-600 w-8' : 
                  selectedAnswers[q.id] !== undefined ? (selectedAnswers[q.id] === q.correctAnswer ? 'bg-green-400 w-2.5' : 'bg-red-400 w-2.5') : 'bg-slate-200 w-2.5'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/60 p-6 md:p-8 border border-slate-100 overflow-hidden relative">
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.1em]">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            {currentQuestion.topic}
          </span>
        </div>
        
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 leading-[1.3] mb-8">
          {currentQuestion.text}
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {currentQuestion.options.map((option, idx) => {
            let stateStyle = "border-slate-100 bg-white hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5";
            if (showFeedback) {
              if (idx === currentQuestion.correctAnswer) {
                stateStyle = "border-green-500 bg-green-50/50 text-green-800 font-bold ring-2 ring-green-100";
              } else if (selectedAnswers[currentQuestion.id] === idx) {
                stateStyle = "border-red-500 bg-red-50/50 text-red-800 ring-2 ring-red-100";
              } else {
                stateStyle = "border-slate-100 opacity-40 scale-[0.99]";
              }
            }

            return (
              <button
                key={idx}
                disabled={showFeedback}
                onClick={() => handleSelect(idx)}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 group relative ${stateStyle}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black shrink-0 transition-all ${
                  showFeedback && idx === currentQuestion.correctAnswer ? 'bg-green-500 text-white scale-110' : 
                  showFeedback && selectedAnswers[currentQuestion.id] === idx ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-600 group-hover:text-white'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="flex-1 font-semibold text-base">{option}</span>
                {showFeedback && idx === currentQuestion.correctAnswer && (
                  <span className="absolute right-4 text-green-500 text-xl font-bold">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {showFeedback && (
          <div className="mt-8 space-y-6 animate-reveal">
            {/* Equal Size Feedback & Navigation Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Feedback Status Card */}
              <div className={`flex-1 p-4 rounded-2xl flex items-center gap-4 ${isCorrect ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'bg-red-500 text-white shadow-lg shadow-red-100'}`}>
                <span className="text-2xl shrink-0">{isCorrect ? '🎯' : '❌'}</span>
                <div className="min-w-0">
                  <p className="font-black text-[10px] uppercase tracking-widest opacity-80 leading-none mb-1">
                    {isCorrect ? 'Correct Answer' : 'Learn the core concept'}
                  </p>
                  <p className="font-bold text-base truncate">
                    {isCorrect ? 'Well Done!' : 'Incorrect Choice'}
                  </p>
                </div>
              </div>
              
              {/* Next Button Card (Equal Size) */}
              <button
                onClick={next}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98] flex items-center justify-center"
              >
                {isLast ? 'Finish Exam' : 'Next Question →'}
              </button>
            </div>

            {/* Immediate Explanations */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-green-50 border border-green-100">
                <div className="flex items-center gap-2 mb-2 font-black text-[10px] text-green-600 uppercase tracking-[0.2em]">
                  ✅ Correct Rationale
                </div>
                <p className="text-green-800 leading-relaxed font-medium text-sm">{currentQuestion.explanation}</p>
              </div>

              {!isCorrect && (
                <div className="p-5 rounded-2xl bg-red-50 border border-red-100">
                  <div className="flex items-center gap-2 mb-2 font-black text-[10px] text-red-600 uppercase tracking-[0.2em]">
                    💡 Distractor Analysis
                  </div>
                  <p className="text-red-800 leading-relaxed font-medium text-sm">{currentQuestion.distractorRationale}</p>
                </div>
              )}
            </div>

            {/* AI Deep Dive Trigger */}
            {!hasRequestedDetails && (
              <div className="flex justify-center">
                <button
                  onClick={handleRequestDeepDive}
                  className="w-full py-4 bg-white text-indigo-600 border-2 border-indigo-100 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-50 hover:border-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  🔬 Explore Deep Dive Analysis
                </button>
              </div>
            )}

            {/* AI Deep Dive Content Section */}
            {hasRequestedDetails && (
              <div className="space-y-6">
                {isLoadingAnalysis && (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse">
                    <div className="w-10 h-10 border-4 border-indigo-100 rounded-full border-t-indigo-500 animate-spin"></div>
                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Synthesizing clinical rationale...</span>
                  </div>
                )}

                {aiAnalysis && (
                  <div className="p-6 md:p-8 rounded-[32px] bg-slate-900 text-slate-100 border border-slate-800 shadow-3xl overflow-hidden relative animate-reveal">
                    <div className="flex items-center justify-between mb-6 relative z-10">
                      <div className="flex items-center gap-2 font-black text-[10px] text-indigo-400 uppercase tracking-[0.2em]">
                        <span className="text-xl">🤖</span> AI Insight Summary
                      </div>
                    </div>
                    
                    <div 
                      className="prose-content relative z-10 text-slate-300 text-sm"
                      dangerouslySetInnerHTML={{ __html: renderedAnalysis }}
                    />

                    {aiAnalysis.suggestions.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-slate-800 relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-4">Related Topics</p>
                        <div className="flex flex-col gap-2">
                          {aiAnalysis.suggestions.map((s, idx) => (
                            <button
                              key={idx}
                              onClick={() => onExploreRelated(s)}
                              className="text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-between group"
                            >
                              <span className="text-sm font-bold text-slate-200">{s}</span>
                              <span className="text-indigo-400">→</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Secondary Next Button inside Deep Dive */}
                    <div className="mt-10 relative z-10">
                      <button
                        onClick={next}
                        className="w-full py-4 bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-400 transition-all shadow-xl active:scale-[0.98]"
                      >
                        {isLast ? 'Complete & View Results' : 'Proceed to Next →'}
                      </button>
                    </div>

                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
