
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
    setIsMobileMenuOpen(false);
    
    try {
      const generated = await generateQuizQuestions(topic, count, difficulty);
      setQuestions(generated);
      setView('quiz');
      setAnswers({});
    } catch (err: any) {
      setError(err?.message || "Failed to generate questions. The service is experiencing peak demand. Please try again.");
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
    setError(null);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-4xl">💊</div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Compounding Your Quiz...</h2>
        <p className="text-slate-500 max-w-sm mb-4">We are rotating through our high-availability Gemini models to prepare your session for "{selectedTopic}".</p>
        <div className="flex flex-col items-center gap-3">
          <div className="px-4 py-2 bg-blue-50 rounded-full border border-blue-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Multi-Key Fallback Active</span>
          </div>
          <div className="px-4 py-2 bg-green-50 rounded-full border border-green-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase text-green-600 tracking-widest">Verifying clinical facts via Search</span>
          </div>
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
              <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Zero-Downtime Engine</p>
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
              Join Community
            </a>

            <button 
              className="md:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
      </header>

      {view === 'home' && (
        <main className="max-w-7xl mx-auto px-6 md:px-8 pt-12">
          {error && (
            <div className="mb-10 p-6 bg-red-50 border-2 border-red-100 rounded-[24px] animate-reveal">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm shrink-0">⚠️</div>
                <div className="flex-1 text-center md:text-left">
                  <h4 className="font-black text-red-800 text-sm uppercase tracking-widest mb-1">Service Congestion</h4>
                  <p className="text-red-600 text-sm leading-relaxed">{error}</p>
                </div>
                <button 
                  onClick={() => lastConfig && handleStartPractice(lastConfig.topic, lastConfig.count, lastConfig.difficulty)}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95"
                >
                  Force Retry
                </button>
              </div>
            </div>
          )}

          <section className="mb-16 text-center max-w-3xl mx-auto animate-reveal">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider mb-6 border border-green-100">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Enhanced System: Strict Key Rotation Active
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 leading-tight break-words">
              Master your <span className="text-blue-600 underline decoration-blue-100 decoration-8 underline-offset-4">Pharmacist Exams</span>
            </h2>
            <p className="text-base md:text-lg text-slate-500 mb-10 leading-relaxed">
              Precision practice for ESIC, RRB, GPAT, and State PSC. 
              Our new multi-tier fallback architecture ensures the laboratory stays online even during peak hours.
            </p>
          </section>

          <section className="mb-12">
            <CustomTopicCard onStart={handleStartPractice} isLoading={loading} />
          </section>

          <section className="mb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
              <div className="space-y-1">
                <h3 className="text-xl md:text-2xl font-bold text-slate-800">Standard Curriculum</h3>
                <p className="text-slate-500 text-sm">Select a primary subject to start practice.</p>
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Set Difficulty</span>
                <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1">
                  {difficultyLevels.map((level) => (
                    <button
                      key={level}
                      onClick={() => setGlobalDifficulty(level)}
                      className={`px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
                        globalDifficulty === level ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
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
    </div>
  );
};

export default App;
