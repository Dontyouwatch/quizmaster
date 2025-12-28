
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Question } from '../types';

interface StatsViewProps {
  questions: Question[];
  answers: Record<string, number>;
  onRestart: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ questions, answers, onRestart }) => {
  const correctCount = questions.reduce((acc, q) => (answers[q.id] === q.correctAnswer ? acc + 1 : acc), 0);
  const scorePercentage = Math.round((correctCount / questions.length) * 100);

  const data = [
    { name: 'Correct', value: correctCount, color: '#22c55e' },
    { name: 'Incorrect', value: questions.length - correctCount, color: '#ef4444' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Practice Complete!</h2>
        <p className="text-slate-500">Great job completing your daily pharmacist drill.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center col-span-1">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-black text-slate-800">{scorePercentage}%</span>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wide mt-1">Overall Accuracy</p>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400 uppercase">Correct Answers</p>
              <p className="text-2xl font-bold text-green-600">{correctCount} / {questions.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500 text-2xl">✓</div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400 uppercase">Pharmacist Rank (Simulated)</p>
              <p className="text-2xl font-bold text-blue-600">
                {scorePercentage >= 80 ? 'Grade A (Excellent)' : scorePercentage >= 60 ? 'Grade B (Steady)' : 'Keep Practicing'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 text-2xl">🎓</div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
             <p className="text-sm font-medium text-slate-400 uppercase mb-4">Topic Mastery Breakdown</p>
             <div className="space-y-3">
               <div className="flex justify-between text-sm mb-1">
                 <span className="text-slate-600">{questions[0].topic}</span>
                 <span className="font-bold">{scorePercentage}%</span>
               </div>
               <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                 <div className="bg-blue-500 h-full transition-all" style={{ width: `${scorePercentage}%` }}></div>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-12">
        <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Question Review</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {questions.map((q, idx) => (
            <div key={q.id} className="p-8">
              <div className="flex gap-4 items-start">
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${answers[q.id] === q.correctAnswer ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {idx + 1}
                </div>
                <div>
                  <h4 className="text-lg font-medium text-slate-800 mb-2">{q.text}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className={`text-sm px-3 py-2 rounded-lg border ${
                        oIdx === q.correctAnswer ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 
                        oIdx === answers[q.id] ? 'bg-red-50 border-red-200 text-red-700' : 'border-slate-100 text-slate-500'
                      }`}>
                        {opt}
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600 leading-relaxed italic border-l-4 border-slate-300">
                    "{q.explanation}"
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onRestart}
          className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 hover:scale-105 active:scale-95"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};
