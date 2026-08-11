import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { UserPerformanceData } from '../../types';
import {
  Award,
  Calendar,
  CheckCircle,
  XCircle,
  HelpCircle,
  Sparkles,
  Shield,
  UserCheck,
  TrendingUp,
  Activity,
  Printer,
  Clock,
  MapPin,
  Mail,
  User as UserIcon,
  Phone,
  FileText
} from 'lucide-react';

interface UserPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
}

export const UserPerformanceModal: React.FC<UserPerformanceModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName
}) => {
  const [data, setData] = useState<UserPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'quiz' | 'activity'>('overview');

  useEffect(() => {
    if (isOpen && userId) {
      fetchPerformance();
    }
  }, [isOpen, userId]);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getUserPerformance(userId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load user performance data.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`ޔޫޒަރ ޕަރފޯމަންސް ޑޭޝްބޯޑު (User Performance Dashboard): ${userName || data?.fullName || ''}`}
      maxWidth="4xl"
    >
      {loading ? (
        <div className="py-12 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium">ޕަރފޯމަންސް ޑޭޝްބޯޑު ލޯޑުވަނީ...</p>
        </div>
      ) : error ? (
        <div className="py-8 text-center text-rose-400 text-xs space-y-3">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchPerformance}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Try Again
          </button>
        </div>
      ) : data ? (
        <div className="space-y-6" dir="rtl">
          {/* Header Card with User & Linked Member Information */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                {data.profileImage ? (
                  <img
                    src={data.profileImage}
                    alt={data.fullName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-500/30 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold text-xl flex items-center justify-center shadow-inner">
                    {data.fullName.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white font-heading">{data.fullName}</h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      @{data.username}
                    </span>
                  </div>
                  <p className="text-xs text-orange-400 mt-1 font-semibold flex items-center gap-2">
                    <span>{data.designation}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">{data.roleName}</span>
                  </p>

                  {/* Linked Member Tag */}
                  {data.member ? (
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-[11px] font-bold">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>ގުޅުވާފައިވާ މެންބަރު: {data.member.memberNumber} ({data.member.fullName})</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                        {data.member.memberType} Member
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 border border-slate-700/50 text-slate-400 rounded-lg text-[11px]">
                        <span>ވަކި މެންބަރަކާ ގުޅުވާފައެއް ނެތް</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Overall Score Badge */}
              <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 shadow-inner">
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Performance Score
                  </span>
                  <div className="text-2xl font-black text-orange-400 font-mono mt-0.5">
                    {data.overallScore}<span className="text-xs text-slate-500 font-normal">/100</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Subtabs Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'overview'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>ޚުލާޞާ (Overview)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'attendance'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>ޙާޟިރީ ({data.attendance.records.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('quiz')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'quiz'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>ރަމަޟާން ކުއިޒް ({data.quiz.submissions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'activity'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ސިސްޓަމް ޙަރަކާތްތައް</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all hidden sm:flex items-center gap-1.5 text-xs font-semibold"
              title="Print Summary Report"
            >
              <Printer className="w-3.5 h-3.5 text-orange-400" />
              <span>Print Report</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Performance Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendance Rate</span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {data.attendance.attendanceRate}%
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {data.attendance.totalPresent} present / {data.attendance.records.length} records
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Quiz Accuracy</span>
                  <div className="text-2xl font-black text-amber-400 font-mono">
                    {data.quiz.accuracyRate}%
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {data.quiz.correctAnswers} correct / {data.quiz.totalAttempts} answers
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Events & Meetings</span>
                  <div className="text-2xl font-black text-sky-400 font-mono">
                    {data.attendance.eventsAttended + data.attendance.meetingsAttended}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {data.attendance.eventsAttended} events, {data.attendance.meetingsAttended} meetings
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Prizes Won</span>
                  <div className="text-2xl font-black text-purple-400 font-mono">
                    {data.quiz.wins.length}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {data.quiz.wins.length > 0 ? 'Official Lucky Draw Winner' : 'No wins recorded'}
                  </p>
                </div>
              </div>

              {/* Earned Badges */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-orange-400" />
                  <span>ޙާޞިލުކޮށްފައިވާ ބެޖުތައް (Earned Performance Badges)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.badges.map(badge => (
                    <div
                      key={badge.id}
                      className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-3"
                    >
                      <div className="p-2 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white font-heading">{badge.title}</h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">{badge.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE RECORDS */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>ޖުމްލަ ޙާޟިރީ ރެކޯޑު: {data.attendance.records.length}</span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-emerald-400">● ހާޟިރު: {data.attendance.totalPresent}</span>
                  <span className="text-amber-400">● ސަލާމް: {data.attendance.totalExcused}</span>
                  <span className="text-rose-400">● ޣައިރު ހާޟިރު: {data.attendance.totalAbsent}</span>
                </div>
              </div>

              {data.attendance.records.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
                  މި ޔޫޒަރަށް އަދި ވަކި ހަރަކާތަކުން ނުވަތަ ބައްދަލުވުމަކުން ހާޟިރީ މާކު ކުރެވިފައެއް ނެތެވެ.
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="p-3">ބާވަތް & ނަން</th>
                        <th className="p-3">ތާރީޚު & ތަން</th>
                        <th className="p-3 text-center">ޙާޟިރީ</th>
                        <th className="p-3 text-left">ނޯޓް</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {data.attendance.records.map(rec => (
                        <tr key={`${rec.type}_${rec.id}`} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                rec.type === 'event' ? 'bg-sky-950 text-sky-400 border border-sky-800' : 'bg-purple-950 text-purple-400 border border-purple-800'
                              }`}>
                                {rec.type}
                              </span>
                              <span className="font-semibold text-white">{rec.title}</span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">
                            <div>{rec.date ? new Date(rec.date).toLocaleDateString() : 'N/A'}</div>
                            {rec.venue && <div className="text-slate-500 text-[10px]">{rec.venue}</div>}
                          </td>
                          <td className="p-3 text-center">
                            {rec.status === 'present' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg font-bold text-[10px]">
                                <CheckCircle className="w-3 h-3" />
                                <span>Present</span>
                              </span>
                            )}
                            {rec.status === 'absent' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg font-bold text-[10px]">
                                <XCircle className="w-3 h-3" />
                                <span>Absent</span>
                              </span>
                            )}
                            {rec.status === 'excused' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg font-bold text-[10px]">
                                <Clock className="w-3 h-3" />
                                <span>Excused</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-left text-[11px] text-slate-400">
                            {rec.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QUIZ PERFORMANCE */}
          {activeTab === 'quiz' && (
            <div className="space-y-4">
              {/* Winners Card if any */}
              {data.quiz.wins.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-800/60 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>ކުއިޒް އިނާމު ލިބުނު ރެކޯޑު (Lucky Draw Winner)</span>
                  </span>
                  <div className="space-y-2">
                    {data.quiz.wins.map(w => (
                      <div key={w.id} className="p-3 bg-slate-950/80 rounded-xl border border-purple-900/40 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">ސުވާލު #{w.questionNumber}: {w.prizeTitle}</p>
                          {w.sponsorName && <p className="text-[10px] text-purple-300">ސްޕޮންސަރ: {w.sponsorName}</p>}
                        </div>
                        <span className="px-2.5 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded-lg text-[10px] font-bold">
                          {w.prizeCollectionStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-400">
                ޖުމްލަ ޖަވާބު ދެވިފައިވާ ސުވާލު: <strong className="text-white">{data.quiz.submissions.length}</strong> | ރަނގަޅު ޖަވާބު: <strong className="text-emerald-400">{data.quiz.correctAnswers}</strong>
              </div>

              {data.quiz.submissions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
                  މި ޔޫޒަރުގެ ނަމުގައި ނުވަތަ ފޯނު ނަންބަރުން ރަމަޟާން ކުއިޒަށް އެއްވެސް ޖަވާބެއް ހުށަހަޅާފައެއް ނެތެވެ.
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="p-3">ސުވާލު</th>
                        <th className="p-3">ޚިޔާރުކުރި ޖަވާބު</th>
                        <th className="p-3 text-center">ނަތީޖާ</th>
                        <th className="p-3 text-left">ސުންގަޑި/ތާރީޚު</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {data.quiz.submissions.map(sub => (
                        <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-semibold text-white">
                            ސުވާލު #{sub.questionNumber}: {sub.questionTitle}
                          </td>
                          <td className="p-3 text-slate-300 font-mono text-[11px]">
                            {sub.selectedOptionText || 'Selected Choice'}
                          </td>
                          <td className="p-3 text-center">
                            {sub.isCorrect ? (
                              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-bold text-[10px]">
                                Correct ✓
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-slate-800 text-slate-400 rounded-full font-bold text-[10px]">
                                Submitted
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-left text-slate-500 font-mono text-[10px]">
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ACTIVITY & LOGS */}
          {activeTab === 'activity' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase">މެސެޖު އިންބޮކްސް ޙަރަކާތްތައް</span>
                  <Mail className="w-4 h-4 text-orange-400" />
                </div>
                <div className="text-3xl font-black text-white font-mono">{data.activity.messagesCount}</div>
                <p className="text-[11px] text-slate-400">Total inbox messages sent, received or assigned</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase">ސިސްޓަމް އޮޑިޓް ލޮގްތައް</span>
                  <FileText className="w-4 h-4 text-orange-400" />
                </div>
                <div className="text-3xl font-black text-white font-mono">{data.activity.auditLogsCount}</div>
                <p className="text-[11px] text-slate-400">System actions executed & logged in audit history</p>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
};
