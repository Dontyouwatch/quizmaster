
import React, { useState, useEffect } from 'react';
import { TOPICS_METADATA, EXAM_TARGETS } from './constants';
import { ExamTopic, Question, Difficulty, UserStats, QuizAttempt } from './types';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    setShowSetupModal(false);
    setIsMobileMenuOpen(false);
    try {
      const generated = await generateQuizQuestions(topic, count, difficulty);
      setQuestions(generated);
      setView('quiz');
      setAnswers({});
    } catch (err) {
      setError("Failed to generate questions. The pharmacy lab is currently busy! Please try again.");
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

  const handleExploreRelated = (topic: string) => {
    handleStartPractice(topic, 10, globalDifficulty);
  };

  const reset = () => {
    setView('home');
    setSelectedTopic(null);
    setQuestions([]);
    setAnswers({});
    setShowSetupModal(false);
    setPendingTopicId(null);
    setIsMobileMenuOpen(false);
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
        <p className="text-slate-500 max-w-sm">AI is formulating high-yield pharmacist questions for <strong>"{selectedTopic}"</strong>.</p>
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
    <div className="min-h-screen bg-slate-50 pb-20 overflow-x-hidden flex flex-col">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-blue-200">
              💊
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm md:text-lg font-black text-slate-800 leading-tight">PharmaQuiz <span className="text-blue-600">Pro</span></h1>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Aistudio Power</p>
            </div>
          </div>
          
          <nav className="hidden md:flex gap-8">
            <button 
              onClick={() => setView('home')}
              className={`text-sm font-medium transition-colors ${view === 'home' ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}
            >
              Practice Hub
            </button>
            <button 
              onClick={() => setView('dashboard')}
              className={`text-sm font-medium transition-colors ${view === 'dashboard' ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}
            >
              My Performance
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <a 
              href="https://t.me/toolspire" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-slate-900 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-full text-[10px] md:text-sm font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              Join Us <span className="hidden sm:inline">→</span>
            </a>

            {/* Hamburger Toggle */}
            <button 
              className="md:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden pt-4 pb-2 border-t border-slate-100 mt-4 animate-reveal">
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => { setView('home'); setIsMobileMenuOpen(false); }}
                className={`px-4 py-3 rounded-xl text-sm font-bold text-left transition-all flex items-center gap-3 ${view === 'home' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="text-lg">🎯</span> Practice Hub
              </button>
              <button 
                onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }}
                className={`px-4 py-3 rounded-xl text-sm font-bold text-left transition-all flex items-center gap-3 ${view === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="text-lg">📊</span> My Performance
              </button>
            </div>
          </div>
        )}
      </header>

      {view === 'home' && (
        <main className="max-w-7xl mx-auto px-6 md:px-8 pt-12">
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm flex items-center gap-3">
              <span>⚠️</span> {error}
            </div>
          )}

          <section className="mb-16 text-center max-w-3xl mx-auto animate-reveal">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Exam Season 2026 Prep Live
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 leading-tight break-words">
              Master your <span className="text-blue-600 underline decoration-blue-100 decoration-8 underline-offset-4">Pharmacist Exams</span> with AI
            </h2>
            <p className="text-base md:text-lg text-slate-500 mb-10 leading-relaxed">
              Targeted practice for ESIC, RRB, GPAT, and State PSC Government Exams. 
              Our AI analyzes your performance to help you master complex clinical pharmacy.
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 md:gap-3 text-[10px] md:text-xs">
              {EXAM_TARGETS.map(target => (
                <span key={target} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-600 font-medium shadow-sm hover:border-blue-300 transition-colors cursor-default">
                  #{target}
                </span>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <CustomTopicCard onStart={handleStartPractice} isLoading={loading} />
          </section>

          <section className="mb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-800">Browse Standard Curriculum</h3>
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
                        className={`px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
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
                  onClick={() => handleTopicClick(topic.id as string)}
                />
              ))}
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
          onRetake={handleRetake}
          onCustomQuiz={() => setView('home')}
        />
      )}

      {view === 'dashboard' && (
        <PerformanceDashboard stats={stats} onClose={reset} />
      )}

      {showSetupModal && pendingTopicId && (
        <QuizSetupModal 
          topic={pendingTopicId}
          difficulty={globalDifficulty}
          onClose={() => setShowSetupModal(false)}
          onStart={(count) => handleStartPractice(pendingTopicId, count)}
        />
      )}

      <footer className="mt-auto py-12 px-6 border-t border-slate-200 bg-white text-center">
        <div className="mb-6">
          <a 
            href="https://t.me/toolspire" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl text-sm font-black transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .33z"/>
            </svg>
            Join Us in Telegram →
          </a>
        </div>
        <p className="text-slate-400 text-sm mb-4">Designed for Indian Pharmacy Professionals</p>
        <div className="space-y-1">
          <p className="text-slate-400 text-xs uppercase tracking-widest font-black">
            © 2026 Tharun Kumar Mekala
          </p>
          <p className="text-slate-300 text-[10px] uppercase font-bold">PharmaQuiz Pro</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
