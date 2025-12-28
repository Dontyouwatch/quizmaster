
import React, { useState } from 'react';
import { TOPICS_METADATA, EXAM_TARGETS } from './constants';
import { ExamTopic, Question, Difficulty } from './types';
import { TopicCard } from './components/TopicCard';
import { QuizEngine } from './components/QuizEngine';
import { StatsView } from './components/StatsView';
import { CustomTopicCard } from './components/CustomTopicCard';
import { generateQuizQuestions } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'quiz' | 'stats'>('home');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalDifficulty, setGlobalDifficulty] = useState<Difficulty>('Medium');

  const handleStartPractice = async (topic: string, difficulty: Difficulty = globalDifficulty) => {
    setLoading(true);
    setError(null);
    setSelectedTopic(topic);
    try {
      const generated = await generateQuizQuestions(topic, 15, difficulty);
      setQuestions(generated);
      setView('quiz');
    } catch (err) {
      setError("Failed to generate questions. The pharmacy lab is currently busy! Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishQuiz = (finalAnswers: Record<string, number>) => {
    setAnswers(finalAnswers);
    setView('stats');
  };

  const handleExploreRelated = (topic: string) => {
    // When exploring related topics, we keep the current difficulty
    handleStartPractice(topic, globalDifficulty);
  };

  const reset = () => {
    setView('home');
    setSelectedTopic(null);
    setQuestions([]);
    setAnswers({});
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-4xl">💊</div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Preparing your practice session...</h2>
        <p className="text-slate-500 max-w-sm">AI is formulating 15 high-yield pharmacist questions for <strong>"{selectedTopic}"</strong>.</p>
        <div className="mt-12 flex gap-3">
           <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0s]"></div>
           <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
           <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
        </div>
      </div>
    );
  }

  const difficultyLevels: Difficulty[] = ['Easy', 'Medium', 'Hard'];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-blue-200">
              💊
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 leading-tight">PharmaQuiz <span className="text-blue-600">Pro</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aistudio Power</p>
            </div>
          </div>
          
          <nav className="hidden md:flex gap-8">
            <button className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Daily Drills</button>
            <button className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Exam Roadmap</button>
            <button className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Leaderboard</button>
          </nav>

          <button className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-slate-800 transition-all">
            Get Pro
          </button>
        </div>
      </header>

      {view === 'home' && (
        <main className="max-w-7xl mx-auto px-4 pt-12">
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm flex items-center gap-3">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Hero Section */}
          <section className="mb-16 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Exam Season 2024 Prep Live
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
              Master your <span className="text-blue-600 underline decoration-blue-100 decoration-8 underline-offset-4">Pharmacist Exams</span> with AI
            </h2>
            <p className="text-lg text-slate-500 mb-10 leading-relaxed">
              Targeted practice for ESIC, RRB, GPAT, and State PSC Government Exams. 
              Our AI analyzes your weaknesses and helps you master complex pharmacology in minutes.
            </p>
            
            <div className="flex flex-wrap justify-center gap-3 text-xs">
              {EXAM_TARGETS.map(target => (
                <span key={target} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-600 font-medium shadow-sm">
                  #{target}
                </span>
              ))}
            </div>
          </section>

          {/* Custom Section */}
          <section className="mb-12">
            <CustomTopicCard onStart={handleStartPractice} isLoading={loading} />
          </section>

          {/* Topic Grid */}
          <section className="mb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-slate-800">Browse Standard Curriculum</h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter border animate-in fade-in zoom-in duration-500 ${
                    globalDifficulty === 'Easy' ? 'bg-green-50 text-green-600 border-green-200' :
                    globalDifficulty === 'Medium' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                    'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    {globalDifficulty} MODE
                  </span>
                </div>
                <p className="text-slate-500 text-sm">Select a primary subject to start practice.</p>
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Set Difficulty</span>
                <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1">
                  {difficultyLevels.map((level) => {
                    const isActive = globalDifficulty === level;
                    let activeStyle = "";
                    if (level === 'Easy') activeStyle = "bg-green-500 text-white shadow-lg shadow-green-200";
                    if (level === 'Medium') activeStyle = "bg-blue-600 text-white shadow-lg shadow-blue-200";
                    if (level === 'Hard') activeStyle = "bg-red-500 text-white shadow-lg shadow-red-200";

                    return (
                      <button
                        key={level}
                        onClick={() => setGlobalDifficulty(level)}
                        className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
                          isActive ? activeStyle : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {TOPICS_METADATA.map((topic) => (
                <TopicCard
                  key={topic.id}
                  name={topic.name}
                  description={topic.description}
                  icon={topic.icon}
                  color={topic.color}
                  onClick={() => handleStartPractice(topic.id as string)}
                />
              ))}
            </div>
          </section>

          {/* Feature Highlights */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 py-16 border-t border-slate-200">
             <div className="flex flex-col gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl">✨</div>
                <h4 className="font-bold text-slate-800">AI Deep-Dive</h4>
                <p className="text-sm text-slate-500">Get instant reasoning for every wrong answer, powered by advanced pharmacy knowledge bases.</p>
             </div>
             <div className="flex flex-col gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">📊</div>
                <h4 className="font-bold text-slate-800">Real-time Analytics</h4>
                <p className="text-sm text-slate-500">Track your mastery level per topic and identify gaps in your preparation before the big day.</p>
             </div>
             <div className="flex flex-col gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl">📱</div>
                <h4 className="font-bold text-slate-800">Exam-Native Format</h4>
                <p className="text-sm text-slate-500">Questions curated specifically to match the style of Indian government pharmacist exam boards.</p>
             </div>
          </section>
        </main>
      )}

      {view === 'quiz' && (
        <QuizEngine 
          questions={questions} 
          onFinish={handleFinishQuiz}
          onCancel={reset}
          onExploreRelated={handleExploreRelated}
        />
      )}

      {view === 'stats' && (
        <StatsView 
          questions={questions} 
          answers={answers} 
          onRestart={reset}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto py-12 px-4 border-t border-slate-200 bg-white text-center">
        <p className="text-slate-400 text-sm mb-2">Designed for Indian Pharmacy Professionals</p>
        <p className="text-slate-300 text-xs uppercase tracking-widest font-bold">© 2024 PharmaQuiz Pro • Powered by Gemini Flash</p>
      </footer>
    </div>
  );
};

export default App;
