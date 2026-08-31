import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { PublicSiteData } from '../../types';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { useTableSync } from '../../hooks/useRealtimeSync';
import { Trophy, CheckCircle, BookOpen, Calendar } from 'lucide-react';

export const QuizResultsPage: React.FC = () => {
  const [data, setData] = useState<PublicSiteData | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      api.getPublicSiteData(),
      api.getQuizResultsHistory()
    ]).then(([siteRes, quizRes]) => {
      setData(siteRes);
      setResults(quizRes.results || []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time table sync for completed quiz results and winners
  useTableSync(['quiz_questions', 'quiz_winners', 'quizQuestions', 'quizWinners'], () => {
    loadData();
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <PublicHeader branding={data?.branding || { clubName: 'ARC Club', clubAbbreviation: 'ARC' }} activePath="/quiz/results" />
      
      <main className="flex-1 py-12 max-w-5xl mx-auto px-4 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold font-heading text-white">Previous Quiz Results & Winners</h1>
          <p className="text-sm text-slate-400 mt-2">
            Archive of completed Ramazan Quiz questions, correct answers, and lucky draw winners.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading historical results...</div>
        ) : results.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <p className="text-base font-semibold text-slate-300">No Previous Quiz Results Available Yet</p>
            <p className="text-xs text-slate-500 mt-1">Once a quiz question finishes answer reveal and winner drawing, it will be displayed here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {results.map((item) => (
              <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Question {item.questionNumber}</span>
                    <h3 className="text-xl font-bold text-white font-heading mt-1">{item.title}</h3>
                  </div>
                  {item.winner && (
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-xl text-amber-300 text-xs font-semibold">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>Winner: {item.winner.participantNumber}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-base font-medium text-slate-200">{item.questionText}</p>
                  {item.correctOption && (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-200 text-sm font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Correct Answer ({item.correctOption.optionLabel}): {item.correctOption.optionText}</span>
                    </div>
                  )}
                  {item.answerExplanation && (
                    <p className="text-xs text-slate-400 leading-relaxed pt-1">
                      {item.answerExplanation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <PublicFooter branding={data?.branding || { clubName: 'ARC Club', clubAbbreviation: 'ARC' }} socialLinks={data?.socialLinks} />
    </div>
  );
};
