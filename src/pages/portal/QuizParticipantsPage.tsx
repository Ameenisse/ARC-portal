import React, { useEffect, useState } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { Download, Search, ShieldAlert, CheckCircle, XCircle, Filter } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import { MarkNotEligibleModal } from '../../components/portal/MarkNotEligibleModal';

export const QuizParticipantsPage: React.FC = () => {
  const { showToast } = useToast();
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [questionFilter, setQuestionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [questions, setQuestions] = useState<any[]>([]);

  // Disqualification Modal State
  const [notEligibleModalOpen, setNotEligibleModalOpen] = useState(false);
  const [notEligibleTargetIdentifier, setNotEligibleTargetIdentifier] = useState('');
  const [notEligibleCallback, setNotEligibleCallback] = useState<((reason: string) => Promise<void>) | null>(null);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const [pRes, qRes] = await Promise.all([
        api.getParticipants({
          search,
          questionId: questionFilter !== 'all' ? questionFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined
        }),
        api.getQuizQuestions()
      ]);

      setParticipants(pRes.participants || []);
      setQuestions(qRes || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [questionFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchParticipants();
  };

  const handleDisqualify = (p: any) => {
    if (p.isDisqualified) {
      if (window.confirm(`Restore participant entry #${p.participantNumber}?`)) {
        api.disqualifyParticipant(p.id, false, '').then(() => {
          showToast('success', 'Participant restored to eligible.');
          fetchParticipants();
        }).catch((err: any) => showToast('error', err.message || 'Failed to restore participant.'));
      }
    } else {
      setNotEligibleTargetIdentifier(`Entry #${p.participantNumber} (ID Card: ${p.normalizedIdNumber || p.idNumber || p.maskedIdNumber})`);
      setNotEligibleCallback(() => async (reason: string) => {
        await api.disqualifyParticipant(p.id, true, reason);
        showToast('success', 'Participant entry marked as Not Eligible.');
        fetchParticipants();
      });
      setNotEligibleModalOpen(true);
    }
  };

  const handleExportCSV = async () => {
    try {
      const csv = await api.exportParticipantsCSV(questionFilter !== 'all' ? questionFilter : undefined);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ARC_Quiz_Submissions_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      showToast('success', 'Submissions CSV downloaded.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to export CSV.');
    }
  };

  return (
    <PortalLayout currentModule="quiz_participants" title="Participant Submissions">
      <div className="space-y-6">
        
        {/* Top Header & Search Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-heading text-white">Quiz Submissions & Entries</h2>
            <p className="text-xs text-slate-400">View participant submissions, eligibility status, and export official CSV reports.</p>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-orange-500 text-white font-bold text-xs flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-orange-400" />
            <span>Export CSV Report</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ID, phone, number..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </form>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={questionFilter}
              onChange={e => setQuestionFilter(e.target.value)}
              className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            >
              <option value="all">All Quiz Questions</option>
              {questions.map(q => (
                <option key={q.id} value={q.id}>Day {q.questionNumber}{q.questionText ? `: ${q.questionText.slice(0, 40)}...` : ''}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            >
              <option value="all">All Statuses</option>
              <option value="correct">Correct Only</option>
              <option value="eligible">Eligible Only</option>
              <option value="disqualified">Disqualified Only</option>
            </select>
          </div>

        </div>

        {/* Submissions Table */}
        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading submissions...</div>
        ) : participants.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
            No participant submissions match the current search filters.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-3.5">Participant #</th>
                    <th className="p-3.5">ID Card Number</th>
                    <th className="p-3.5">Contact Phone</th>
                    <th className="p-3.5">Answer Option</th>
                    <th className="p-3.5">Result</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Submitted At</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {participants.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/30">
                      <td className="p-3.5 font-mono font-bold text-orange-400">{p.participantNumber}</td>
                      <td className="p-3.5 font-mono text-white font-medium">{p.normalizedIdNumber || p.idNumber || p.maskedIdNumber}</td>
                      <td className="p-3.5 font-mono text-orange-300 font-medium">{p.contactNumber || p.maskedContactNumber}</td>
                      <td className="p-3.5 font-bold">{p.selectedOptionLabel}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.isCorrect ? 'bg-orange-950 text-orange-400' : 'bg-rose-950 text-rose-400'
                        }`}>
                          {p.isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          p.isDisqualified ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                          (p.isEligibleForDraw || p.isEligible || (p.isCorrect && !p.isDisqualified)) ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {p.isDisqualified ? 'Not Eligible' : (p.isEligibleForDraw || p.isEligible || (p.isCorrect && !p.isDisqualified)) ? 'Eligible' : 'Ineligible'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 font-mono text-[11px]">{formatDateTime(p.submittedAt)}</td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDisqualify(p)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                            p.isDisqualified
                              ? 'bg-orange-950 text-orange-400 hover:bg-orange-900'
                              : 'bg-rose-950 text-rose-400 hover:bg-rose-900'
                          }`}
                        >
                          {p.isDisqualified ? 'Restore Entry' : 'Disqualify'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: Disqualify Confirmation Modal */}
        <MarkNotEligibleModal
          isOpen={notEligibleModalOpen}
          onClose={() => setNotEligibleModalOpen(false)}
          participantIdentifier={notEligibleTargetIdentifier}
          onConfirm={async (reason) => {
            if (notEligibleCallback) {
              await notEligibleCallback(reason);
            }
          }}
        />

      </div>
    </PortalLayout>
  );
};
