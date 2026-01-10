import React, { useState, useEffect } from 'react';
import { TOPICS_METADATA } from './constants';
import { Question, Difficulty, UserStats, QuizAttempt } from './types';
import { TopicCard } from './components/TopicCard';
import { QuizEngine } from './components/QuizEngine';
import { StatsView } from './components/StatsView';
import { CustomTopicCard } from './components/CustomTopicCard';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { QuizSetupModal } from './components/QuizSetupModal';
import { generateQuizQuestions } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'quiz' | 'stats' | 'dashboard'>('home');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalDifficulty, setGlobalDifficulty] = useState<Difficulty>('Medium');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [pendingTopicId, setPendingTopicId] = useState<string | null>(null);
  const [lastConfig, setLastConfig] = useState<{topic: string, count: number, difficulty: Difficulty} | null>(null);

  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('pharmaquiz_stats');
    if (saved) return JSON.parse(saved);
    return {
      totalAttempted: 0,
      correctAnswers: 0,
      topicMastery: {},
      attempts: []
    };
  });

  useEffect(() => {
    localStorage.setItem('pharmaquiz_stats', JSON.stringify(stats));
  }, [stats]);

  const handleStartPractice = async (topic: string, count: number, difficulty: Difficulty = globalDifficulty) => {
    setLoading(true);
    setError(null);
    setSelectedTopic(topic);
    setLastConfig({ topic, count, difficulty });
    setShowSetupModal(false);
    
    try {
      const generated = await generateQuizQuestions(topic, count, difficulty);
      setQuestions(generated);
      setView('quiz');
      setAnswers({});
    } catch (err: any) {
      setError(err?.message || "Generation failed. Please check your connectivity and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTopicClick = (topicId: string) => {
    setPendingTopicId(topicId);
    setShowSetupModal(true);
  };

  const handleRetake = () => {
    setAnswers({});
    setView('quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishQuiz = (finalAnswers: Record<string, number>) => {
    const correctCount = questions.reduce((acc, q) => (finalAnswers[q.id] === q.correctAnswer ? acc + 1 : acc), 0);
    const score = Math.round((correctCount / questions.length) * 100);
    
    const newAttempt: QuizAttempt = {
      id: `attempt-${Date.now()}`,
      date: new Date().toISOString(),
      topic: selectedTopic || 'Custom',
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      score: score,
      difficulty: globalDifficulty
    };

    setStats(prev => {
      const topicMastery = { ...prev.topicMastery };
      const currentMastery = topicMastery[newAttempt.topic] || 0;
      topicMastery[newAttempt.topic] = currentMastery === 0 ? score : (currentMastery + score) / 2;

      return {
        totalAttempted: prev.totalAttempted + newAttempt.totalQuestions,
        correctAnswers: prev.correctAnswers + newAttempt.correctAnswers,
        topicMastery,
        attempts: [...prev.attempts, newAttempt]
      };
    });

    setAnswers(finalAnswers);
    setView('stats');
  };

  const reset = () => {
    setView('home');
    setSelectedTopic(null);
    setQuestions([]);
    setAnswers({});
    setShowSetupModal(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative w-24 h-24 mb-10">
          <div className="absolute inset-0 border-[4px] border-blue-50 rounded-full"></div>
          <div className="absolute inset-0 border-[4px] border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-4xl">🔬</div>
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Analyzing Pharma Syllabus...</h2>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed">Synthesizing high-yield clinical questions for <span className="text-blue-600 font-bold">{selectedTopic}</span></p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 flex flex-col selection:bg-blue-600 selection:text-white">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg group-hover:scale-105 transition-transform">💊</div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">PharmaQuiz <span className="text-blue-600">Pro</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Pharmacist Exam Portal</p>
            </div>
          </div>
          
          <nav className="hidden md:flex gap-10">
            <button onClick={() => setView('home')} className={`text-sm font-black uppercase tracking-widest ${view === 'home' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Practice Hub</button>
            <button onClick={() => setView('dashboard')} className={`text-sm font-black uppercase tracking-widest ${view === 'dashboard' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Performance</button>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('dashboard')}
              className="bg-blue-50 text-blue-600 p-2.5 rounded-xl hover:bg-blue-100 transition-colors md:hidden"
            >
              📊
            </button>
            <a href="https://t.me/toolspire" target="_blank" className="hidden sm:flex bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl items-center gap-2 hover:bg-slate-800 transition-all">
              Join Community
            </a>
          </div>
        </div>
      </header>

      {view === 'home' && (
        <main className="max-w-7xl mx-auto px-6 pt-16">
          {error && (
            <div className="mb-12 p-6 bg-red-50 border border-red-200 rounded-[32px] animate-reveal flex flex-col md:flex-row items-center gap-6 shadow-sm">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm shrink-0">🚨</div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="font-black text-red-900 text-sm uppercase tracking-widest mb-1">System Error</h4>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
              <button onClick={() => lastConfig && handleStartPractice(lastConfig.topic, lastConfig.count)} className="px-8 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-100 active:scale-95">Retry Session</button>
            </div>
          )}

          <section className="mb-20 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-blue-50 text-blue-700 rounded-full text-xs font-black uppercase tracking-[0.15em] mb-8 border border-blue-100/50">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
              2025 ESIC/RRB Syllabus Grounded
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 tracking-tighter leading-[1.05]">
              Ace the <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Pharmacist Exam</span> with AI.
            </h2>
            <p className="text-xl text-slate-500 mb-12 leading-relaxed max-w-2xl mx-auto font-medium">
              Precision practice for Indian Government Pharmacist exams (ESIC, RRB, GPAT, DHS). 
              Real-time clinical reasoning powered by Google Gemini.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {['8k+ MCQs', 'Expert Docs', 'Deep Dives', 'Daily Facts'].map(item => (
                <div key={item} className="bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <CustomTopicCard onStart={handleStartPractice} isLoading={loading} />
          </section>

          <section className="mb-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Core Specializations</h3>
                <p className="text-slate-500 text-sm font-medium mt-1">High-yield modules based on previous year papers from ESIC, RRB, and State PSCs.</p>
              </div>
              <div className="flex bg-slate-200/50 p-1.5 rounded-[22px] gap-1.5 backdrop-blur-sm">
                {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setGlobalDifficulty(level)}
                    className={`px-8 py-2.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${globalDifficulty === level ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {TOPICS_METADATA.map((topic) => (
                <TopicCard
                  key={topic.id}
                  name={topic.name}
                  description={topic.description}
                  icon={topic.icon}
                  color={topic.color}
                  onClick={() => handleTopicClick(topic.id as string)}
                />
              ))}
            </div>
          </section>

          <section className="mb-24 bg-white rounded-[40px] p-8 md:p-12 border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
            <div className="flex-1 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-4 block">Drug Spotlight: India Formulary</span>
              <h3 className="text-3xl font-black text-slate-900 mb-4">Master Pharmacokinetics</h3>
              <p className="text-slate-500 leading-relaxed font-medium mb-8">
                Indian pharmacist exams heavily test mechanisms of action. Practice our custom deep-dive 
                analysis to understand ADME profiles of essential drugs in the National List of Essential Medicines (NLEM).
              </p>
              <button 
                onClick={() => handleStartPractice("Pharmacokinetics and ADME Profiles", 10)}
                className="bg-slate-900 text-white px-10 py-4 rounded-[20px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-300 hover:bg-slate-800 transition-all"
              >
                Launch Drill Session
              </button>
            </div>
            <div className="w-full md:w-80 h-80 bg-blue-50 rounded-[32px] flex items-center justify-center text-9xl relative z-10 shadow-inner">
               💉
               <div className="absolute inset-0 bg-blue-600/5 rounded-[32px] border-4 border-white"></div>
            </div>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] -mr-64 -mt-64"></div>
          </section>
        </main>
      )}

      {view === 'quiz' && (
        <QuizEngine questions={questions} onFinish={handleFinishQuiz} onCancel={reset} onExploreRelated={(topic) => { handleStartPractice(topic, 10); }} />
      )}

      {view === 'stats' && (
        <StatsView questions={questions} answers={answers} onRestart={reset} onRetake={handleRetake} onCustomQuiz={() => setView('home')} />
      )}

      {view === 'dashboard' && (
        <PerformanceDashboard stats={stats} onClose={reset} />
      )}

      {showSetupModal && pendingTopicId && (
        <QuizSetupModal topic={pendingTopicId} difficulty={globalDifficulty} onClose={() => setShowSetupModal(false)} onStart={(count) => handleStartPractice(pendingTopicId, count)} />
      )}
      
      <footer className="mt-auto py-10 px-6 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-sm font-bold text-slate-800">PharmaQuiz Pro © 2025</p>
            <p className="text-xs text-slate-400 font-medium mt-1">Dedicated to Indian Pharmacist Aspirants</p>
          </div>
          <div className="flex gap-6">
            <a href="https://t.me/toolspire" target="_blank" className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">Telegram Community</a>
            <a href="#" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;