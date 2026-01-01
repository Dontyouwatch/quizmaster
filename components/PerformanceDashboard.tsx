
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { QuizAttempt, UserStats } from '../types';

interface PerformanceDashboardProps {
  stats: UserStats;
  onClose: () => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ stats, onClose }) => {
  const recentAttempts = [...stats.attempts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  
  const topicData = Object.entries(stats.topicMastery).map(([name, mastery]) => ({
    name,
    // Fix: Explicitly cast mastery to number as Object.entries value might be inferred as unknown
    mastery: Math.round(mastery as number)
  })).sort((a, b) => b.mastery - a.mastery);

  const trendData = stats.attempts.slice(-7).map(a => ({
    date: new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: a.score
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Your Progress</h2>
          <p className="text-slate-500">Comprehensive analysis of your pharmacy exam preparation.</p>
        </div>
        <button 
          onClick={onClose}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-xl font-bold transition-all"
        >
          Back to Practice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Quizzes Taken</p>
          <p className="text-3xl font-black text-blue-600">{stats.attempts.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Questions</p>
          <p className="text-3xl font-black text-indigo-600">{stats.totalAttempted}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Avg Accuracy</p>
          <p className="text-3xl font-black text-green-600">
            {stats.totalAttempted > 0 ? Math.round((stats.correctAnswers / stats.totalAttempted) * 100) : 0}%
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Core Mastery</p>
          <p className="text-3xl font-black text-amber-500">{topicData.length} Subjects</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">📈</span>
            Score Trend (Last 7 Sessions)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={4} dot={{r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">📊</span>
            Topic Mastery Breakdown
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicData} layout="vertical">
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} width={120} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="mastery" fill="#818cf8" radius={[0, 8, 8, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Recent Session History</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {recentAttempts.length > 0 ? recentAttempts.map(attempt => (
            <div key={attempt.id} className="px-8 py-5 flex items-center justify-between group hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${
                  attempt.score >= 80 ? 'bg-green-50 text-green-600' : attempt.score >= 60 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                }`}>
                  {attempt.score >= 80 ? '🎯' : attempt.score >= 60 ? '📖' : '⚡'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{attempt.topic}</h4>
                  <p className="text-xs text-slate-400 font-medium">{new Date(attempt.date).toLocaleDateString()} • {attempt.difficulty} Level</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-slate-800">{attempt.score}%</p>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{attempt.correctAnswers}/{attempt.totalQuestions} Correct</p>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center">
              <p className="text-slate-400 font-medium italic">No quiz history available yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
