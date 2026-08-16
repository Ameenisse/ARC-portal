import React, { useEffect, useState } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { Download, Search, ShieldAlert, CheckCircle, XCircle, Filter, Users, ListFilter, UserX, UserCheck, Sparkles, RefreshCw } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import { MarkNotEligibleModal } from '../../components/portal/MarkNotEligibleModal';
import { MasterParticipant } from '../../types';

export const QuizParticipantsPage: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'submissions' | 'master_queues'>('submissions');
  const [participants, setParticipants] = useState<any[]>([]);
  const [masterParticipants, setMasterParticipants] = useState<MasterParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(false);

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

      setParticipants(pRes?.participants || (Array.isArray(pRes) ? pRes : []));
      setQuestions(qRes || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterParticipants = async () => {
    try {
      setMasterLoading(true);
      const res = await api.getMasterParticipants();
      setMasterParticipants(Array.isArray(res) ? res : res?.masterParticipants || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load master participant queues.');
    } finally {
      setMasterLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
    fetchMasterParticipants();
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
          fetchMasterParticipants();
        }).catch((err: any) => showToast('error', err.message || 'Failed to restore participant.'));
      }
    } else {
      setNotEligibleTargetIdentifier(`Entry #${p.participantNumber} (ID Card: ${p.normalizedIdNumber || p.idNumber || p.maskedIdNumber})`);
      setNotEligibleCallback(() => async (reason: string) => {
        await api.disqualifyParticipant(p.id, true, reason);
        showToast('success', 'Participant entry marked as Not Eligible.');
        fetchParticipants();
        fetchMasterParticipants();
      });
      setNotEligibleModalOpen(true);
    }
  };

  const handleToggleMasterEligibility = (m: MasterParticipant) => {
    const isCurrentlyBlocked = Boolean(m.isBlocked || m.isNotEligible);
    if (isCurrentlyBlocked) {
      if (window.confirm(`Restore eligibility for ID ${m.idNumber || m.normalizedIdNumber} across all quiz questions?`)) {
        api.toggleMasterParticipantEligibility(m.normalizedIdNumber || m.idNumber, false).then(() => {
          showToast('success', `ID ${m.idNumber || m.normalizedIdNumber} marked Eligible.`);
          fetchMasterParticipants();
          fetchParticipants();
        }).catch((err: any) => showToast('error', err.message || 'Failed to restore eligibility.'));
      }
    } else {
      setNotEligibleTargetIdentifier(`Master ID: ${m.idNumber || m.normalizedIdNumber} (Queue: ${m.queNumber})`);
      setNotEligibleCallback(() => async (reason: string) => {
        await api.toggleMasterParticipantEligibility(m.normalizedIdNumber || m.idNumber, true, reason);
        showToast('success', `ID ${m.idNumber || m.normalizedIdNumber} marked Not Eligible across all questions.`);
        fetchMasterParticipants();
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

  // Filter master participants on search text
  const filteredMaster = masterParticipants.filter(m => {
    if (!search) return true;
    const s = search.toLowerCase().trim();
    return (
      (m.queNumber && m.queNumber.toLowerCase().includes(s)) ||
      (m.idNumber && m.idNumber.toLowerCase().includes(s)) ||
      (m.normalizedIdNumber && m.normalizedIdNumber.toLowerCase().includes(s)) ||
      (m.contactNumber && m.contactNumber.toLowerCase().includes(s))
    );
  });

  return (
    <PortalLayout currentModule="quiz_participants" title="Participant Submissions">
      <div className="space-y-6">
        
        {/* Top Header & Export */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-heading text-white">Quiz Participants & Queue Registry</h2>
            <p className="text-xs text-slate-400">
              Each ID card is assigned a unique, permanent Queue Number (e.g. Q-0001) used consistently across all quiz questions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                fetchParticipants();
                fetchMasterParticipants();
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 font-bold text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-orange-500 text-white font-bold text-xs flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-orange-400" />
              <span>Export CSV Report</span>
            </button>
          </div>
        </div>

        {/* Top Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Submissions</span>
              <span className="text-2xl font-black font-mono text-white">{participants.length}</span>
            </div>
            <ListFilter className="w-6 h-6 text-orange-400/60" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unique Queue #s</span>
              <span className="text-2xl font-black font-mono text-amber-400">{masterParticipants.length}</span>
            </div>
            <Users className="w-6 h-6 text-amber-400/60" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Eligible Submissions</span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {participants.filter(p => p.isEligible && p.isCorrect && !p.isDisqualified).length}
              </span>
            </div>
            <CheckCircle className="w-6 h-6 text-emerald-400/60" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Blocked / Ineligible</span>
              <span className="text-2xl font-black font-mono text-rose-400">
                {masterParticipants.filter(m => m.isBlocked || m.isNotEligible).length}
              </span>
            </div>
            <ShieldAlert className="w-6 h-6 text-rose-400/60" />
          </div>
        </div>

        {/* TAB TOGGLES */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'submissions'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Question Submissions ({participants.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('master_queues')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'master_queues'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Master ID & Que Numbers ({masterParticipants.length})</span>
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
              placeholder="Search Queue # (e.g. Q-0001), ID card, phone..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </form>

          {activeTab === 'submissions' && (
            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={questionFilter}
                onChange={e => setQuestionFilter(e.target.value)}
                className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="all">All Quiz Questions</option>
                {questions.map(q => (
                  <option key={q.id} value={q.id}>Day {q.questionNumber}{q.questionText ? `: ${q.questionText.slice(0, 35)}...` : ''}</option>
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
          )}
        </div>

        {/* TAB 1: QUESTION SUBMISSIONS TABLE */}
        {activeTab === 'submissions' && (
          <div>
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
                        <th className="p-3.5">Que #</th>
                        <th className="p-3.5">ID Card Number</th>
                        <th className="p-3.5">Contact Phone</th>
                        <th className="p-3.5">Question ID</th>
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
                          <td className="p-3.5">
                            <span className="font-mono font-bold px-2 py-0.5 rounded-lg bg-orange-950/80 text-orange-400 border border-orange-500/30">
                              {p.participantNumber}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-white font-medium">{p.normalizedIdNumber || p.idNumber || p.maskedIdNumber}</td>
                          <td className="p-3.5 font-mono text-orange-300 font-medium">{p.contactNumber || p.maskedContactNumber}</td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-400">{p.questionId?.slice(0, 10)}...</td>
                          <td className="p-3.5 font-bold text-amber-300">{p.selectedOptionLabel || 'Selected'}</td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.isCorrect ? 'bg-orange-950 text-orange-400 border border-orange-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                            }`}>
                              {p.isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              p.isDisqualified ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                              (p.isEligible && p.isCorrect) ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {p.isDisqualified ? 'Not Eligible' : (p.isEligible && p.isCorrect) ? 'Eligible' : 'Ineligible'}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400 font-mono text-[11px]">{formatDateTime(p.submittedAt)}</td>
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDisqualify(p)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                                p.isDisqualified
                                  ? 'bg-orange-950 text-orange-400 hover:bg-orange-900 border border-orange-700/40'
                                  : 'bg-rose-950 text-rose-400 hover:bg-rose-900 border border-rose-700/40'
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
          </div>
        )}

        {/* TAB 2: MASTER PARTICIPANT & UNIQUE QUEUE REGISTRY */}
        {activeTab === 'master_queues' && (
          <div>
            {masterLoading ? (
              <div className="py-12 text-center text-slate-400">Loading Master Participant Registry...</div>
            ) : filteredMaster.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
                No Master Participants match the search filters.
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="p-3.5">Permanent Que #</th>
                        <th className="p-3.5">National ID Card</th>
                        <th className="p-3.5">Contact Phone</th>
                        <th className="p-3.5">Questions Attempted</th>
                        <th className="p-3.5">Correct Answers</th>
                        <th className="p-3.5">Global Eligibility</th>
                        <th className="p-3.5">Last Active</th>
                        <th className="p-3.5 text-right">Master Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-200">
                      {filteredMaster.map(m => {
                        const isBlocked = Boolean(m.isBlocked || m.isNotEligible);
                        return (
                          <tr key={m.normalizedIdNumber || m.idNumber} className="hover:bg-slate-800/30">
                            <td className="p-3.5">
                              <span className="font-mono text-sm font-black px-2.5 py-1 rounded-xl bg-orange-950 text-orange-400 border border-orange-500/40 shadow-sm">
                                {m.queNumber}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-white font-bold">{m.normalizedIdNumber || m.idNumber}</td>
                            <td className="p-3.5 font-mono text-orange-300 font-medium">{m.contactNumber || '—'}</td>
                            <td className="p-3.5 font-mono font-bold text-slate-200">{m.totalSubmissions || 0}</td>
                            <td className="p-3.5 font-mono font-bold text-emerald-400">{m.correctCount || 0}</td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                isBlocked ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              }`}>
                                {isBlocked ? 'Not Eligible (Blocked)' : 'Eligible for Draws'}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-400 font-mono text-[11px]">{m.lastSubmittedAt ? formatDateTime(m.lastSubmittedAt) : '—'}</td>
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleToggleMasterEligibility(m)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 ml-auto ${
                                  isBlocked
                                    ? 'bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-700/50'
                                    : 'bg-rose-950 text-rose-400 hover:bg-rose-900 border border-rose-700/50'
                                }`}
                              >
                                {isBlocked ? (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Restore Eligible</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>Mark Not Eligible</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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

