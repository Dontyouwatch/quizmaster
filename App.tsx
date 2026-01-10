
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
      setError(err?.message || "Generation failed. Please check your API configuration and try again.");
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
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-[3px] border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-[3px] border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-3xl">💊</div>
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Compounding Your Session...</h2>
        <p className="text-slate-500 text-sm max-w-xs">Synthesizing high-yield questions for {selectedTopic}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 flex flex-col">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">💊</div>
            <div>
              <h1 className="text-lg font-black text-slate-800 leading-tight">PharmaQuiz <span className="text-blue-600">Pro</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expert Exam Engine</p>
            </div>
          </div>
          
          <nav className="hidden md:flex gap-8">
            <button onClick={() => setView('home')} className={`text-sm font-bold ${view === 'home' ? 'text-blue-600' : 'text-slate-500'}`}>Practice Hub</button>
            <button onClick={() => setView('dashboard')} className={`text-sm font-bold ${view === 'dashboard' ? 'text-blue-600' : 'text-slate-500'}`}>My Progress</button>
          </nav>

          <a href="https://t.me/toolspire" target="_blank" className="hidden sm:flex bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg items-center gap-2">
            Join Telegram
          </a>
        </div>
      </header>

      {view === 'home' && (
        <main className="max-w-7xl mx-auto px-6 pt-12">
          {error && (
            <div className="mb-10 p-6 bg-red-50 border-2 border-red-100 rounded-3xl animate-reveal flex flex-col md:flex-row items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shrink-0">⚠️</div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="font-black text-red-800 text-sm uppercase mb-1">Service Alert</h4>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <button onClick={() => lastConfig && handleStartPractice(lastConfig.topic, lastConfig.count)} className="px-6 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase">Retry</button>
            </div>
          )}

          <section className="mb-16 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              2025 ESIC/RRB Syllabus Updated
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
              Master Your <span className="text-blue-600">Pharmacist Exams</span>
            </h2>
            <p className="text-lg text-slate-500 mb-10 leading-relaxed">
              Precision MCQ practice with real-time AI reasoning. 
              Built for Indian Govt Exam Aspirants (DHS, RRB, GPAT, NHM).
            </p>
          </section>

          <section className="mb-12">
            <CustomTopicCard onStart={handleStartPractice} isLoading={loading} />
          </section>

          <section className="mb-20">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Topic Specialties</h3>
                <p className="text-slate-500 text-sm">Focused drills on core pharmacy curriculum.</p>
              </div>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setGlobalDifficulty(level)}
                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${globalDifficulty === level ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
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
        /* Fix: Use a wrapper to provide the required 'count' argument to handleStartPractice and match (topic: string) => void */
        <QuizEngine questions={questions} onFinish={handleFinishQuiz} onCancel={reset} onExploreRelated={(topic) => handleStartPractice(topic, 10)} />
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
    </div>
  );
};

export default App;
