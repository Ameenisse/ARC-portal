import React, { useState } from 'react';
import { UserPerformanceData, UserPerformanceBadge } from '../../types';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import {
  TrendingUp,
  Award,
  Calendar,
  HelpCircle,
  Trophy,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  UserCheck,
  ChevronRight,
  Printer
} from 'lucide-react';
import { UserPerformanceModal } from './UserPerformanceModal';

export interface PerformanceStatusInfo {
  tier: 'elite' | 'excellent' | 'active' | 'developing';
  labelEn: string;
  labelDh: string;
  grade: string;
  badgeColor: string;
  badgeBorder: string;
  badgeBg: string;
  textColor: string;
  barGradient: string;
  summaryDh: string;
  summaryEn: string;
}

export function computePerformanceStatus(data: UserPerformanceData): PerformanceStatusInfo {
  const score = data.overallScore ?? 0;
  const attendanceRate = data.attendance?.attendanceRate ?? 0;
  const isUpToDate = data.budget?.summary?.isUpToDate ?? true;

  if (score >= 80 && attendanceRate >= 70 && isUpToDate) {
    return {
      tier: 'elite',
      labelEn: 'Outstanding Standing',
      labelDh: 'އެންމެ މަތީ ފެންވަރު (އައުޓްސްޓޭންޑިންގ)',
      grade: 'A+',
      badgeColor: 'text-emerald-400',
      badgeBorder: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/15',
      textColor: 'text-emerald-400',
      barGradient: 'from-emerald-500 to-teal-400',
      summaryDh: 'ކްލަބްގެ ހަރަކާތްތަކުގައި ބައިވެރިވުން މަތިވެ، ގަވާއިދުން ފީ ދައްކާ ފުރިހަމަ ޙާލަތުގައިވާ މެންބަރެއް.',
      summaryEn: 'Exemplary club engagement, high attendance attendance rate, and membership dues fully paid.'
    };
  }

  if (score >= 65) {
    return {
      tier: 'excellent',
      labelEn: 'High Standing',
      labelDh: 'ވަރަށް ރަނގަޅު ޙާލަތުގައި',
      grade: 'A',
      badgeColor: 'text-sky-400',
      badgeBorder: 'border-sky-500/40',
      badgeBg: 'bg-sky-500/15',
      textColor: 'text-sky-400',
      barGradient: 'from-sky-500 to-indigo-400',
      summaryDh: 'ކްލަބްގެ ހަރަކާތްތަކުގައި މެދުނުކެނޑި ބައިވެރިވާ އަދި ހިންގުމުގައި އެއްބާރުލުންދޭ މެންބަރެއް.',
      summaryEn: 'Active and dependable participation in club programs with solid overall performance.'
    };
  }

  if (score >= 40) {
    return {
      tier: 'active',
      labelEn: 'Active Contributor',
      labelDh: 'ހަރަކާތްތެރި މެންބަރެއް',
      grade: 'B',
      badgeColor: 'text-amber-400',
      badgeBorder: 'border-amber-500/40',
      badgeBg: 'bg-amber-500/15',
      textColor: 'text-amber-400',
      barGradient: 'from-amber-500 to-orange-400',
      summaryDh: 'ކްލަބްގެ މުހިންމު ހަރަކާތްތަކުގައި ބައިވެރިވާ، ކުރިއަށް ދިއުމަށް ފުރުޞަތު އޮތް މެންބަރެއް.',
      summaryEn: 'Participating in core club events with steady involvement across activities.'
    };
  }

  return {
    tier: 'developing',
    labelEn: 'Developing Engagement',
    labelDh: 'ބައިވެރިވުން އިތުރުކުރަންޖެހޭ',
    grade: 'C',
    badgeColor: 'text-orange-400',
    badgeBorder: 'border-orange-500/40',
    badgeBg: 'bg-orange-500/15',
    textColor: 'text-orange-400',
    barGradient: 'from-orange-500 to-rose-400',
    summaryDh: 'ކްލަބްގެ ބައްދަލުވުންތަކާއި ހަރަކާތްތަކުގައި ބައިވެރިވުން އިތުރުކުރުމަށް ބާރުއަޅަންޖެހޭ.',
    summaryEn: 'Encouraged to attend upcoming club meetings, events, and community activities.'
  };
}

interface MemberPerformanceStatusCardProps {
  data: UserPerformanceData;
  compact?: boolean;
  onOpenReport?: () => void;
  accentColor?: 'amber' | 'emerald' | 'sky' | 'indigo' | 'rose' | 'orange';
}

export const MemberPerformanceStatusCard: React.FC<MemberPerformanceStatusCardProps> = ({
  data,
  compact = false,
  onOpenReport,
  accentColor = 'orange'
}) => {
  const { lang } = usePortalLanguage();
  const isDh = lang === 'dhivehi';
  const [modalOpen, setModalOpen] = useState(false);

  const status = computePerformanceStatus(data);
  const score = data.overallScore ?? 0;
  const attendanceRate = data.attendance?.attendanceRate ?? 0;
  const totalPresent = data.attendance?.totalPresent ?? 0;
  const eventsAttended = data.attendance?.eventsAttended ?? 0;
  const meetingsAttended = data.attendance?.meetingsAttended ?? 0;
  const quizAttempts = data.quiz?.totalAttempts ?? 0;
  const quizAccuracy = data.quiz?.accuracyRate ?? 0;
  const quizWins = data.quiz?.wins?.length ?? 0;
  const duesStatus = data.budget?.summary?.status ?? 'good_standing';
  const isDuesUpToDate = data.budget?.summary?.isUpToDate ?? (duesStatus === 'good_standing');
  const badges: UserPerformanceBadge[] = data.badges || [];

  const handleOpenReport = () => {
    if (onOpenReport) {
      onOpenReport();
    } else {
      setModalOpen(true);
    }
  };

  return (
    <div
      className="bg-slate-900/95 border border-slate-800 hover:border-slate-750 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 relative overflow-hidden transition-all"
      dir={isDh ? 'rtl' : 'ltr'}
    >
      {/* Soft Ambient Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Row: Title & Performance Status Tier */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 relative z-10">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                {isDh ? 'މެންބަރުގެ ޕާފޯމަންސް ޙާލަތު' : 'Individual Performance Status'}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400 font-mono">
                {data.fullName || data.username}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white font-heading">
              {isDh ? 'އަމިއްލަ ޕާފޯމަންސް އަދި ބައިވެރިވުމުގެ ޙާލަތު' : 'Personal Standing & Performance Record'}
            </h3>
          </div>
        </div>

        {/* Live Status Tier Badge & Action */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <div className={`px-3.5 py-1.5 rounded-xl ${status.badgeBg} border ${status.badgeBorder} flex items-center gap-2 shadow-sm`}>
            <span className={`w-2 h-2 rounded-full ${status.textColor} bg-current animate-pulse`} />
            <span className={`text-xs font-black uppercase tracking-wider ${status.textColor}`}>
              {isDh ? status.labelDh : status.labelEn}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-950/60 font-mono text-[11px] font-bold text-white border border-slate-700">
              {status.grade}
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenReport}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>{isDh ? 'ރިޕޯޓު ބައްލަވާ' : 'View Full Report'}</span>
          </button>
        </div>
      </div>

      {/* Main Score Bar & Standing Summary */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 relative z-10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isDh ? 'ޖުމްލަ ޕާފޯމަންސް ސްކޯރ' : 'Overall Performance Score'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                {score}
              </span>
              <span className="text-xs font-bold text-slate-400">/ 100</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 font-dhivehi leading-relaxed max-w-xl">
            {isDh ? status.summaryDh : status.summaryEn}
          </p>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full bg-gradient-to-r ${status.barGradient} rounded-full transition-all duration-700`}
            style={{ width: `${Math.min(100, Math.max(8, score))}%` }}
          />
        </div>
      </div>

      {/* 4 Pillars Performance Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative z-10">
        {/* Pillar 1: Attendance Standing */}
        <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-2 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isDh ? 'ޙާޟިރީގެ ޙާލަތު' : 'Attendance Standing'}
            </span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {attendanceRate}%
            </span>
            <span className="text-[11px] text-sky-400 font-semibold">
              {isDh ? `${totalPresent} ޙާޟިރުވި` : `${totalPresent} attended`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span>{isDh ? `ބައްދަލުވުން: ${meetingsAttended}` : `Meetings: ${meetingsAttended}`}</span>
            <span>•</span>
            <span>{isDh ? `ހަރަކާތް: ${eventsAttended}` : `Events: ${eventsAttended}`}</span>
          </div>
        </div>

        {/* Pillar 2: Ramadan Quiz & Knowledge Activity */}
        <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-2 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isDh ? 'ކުއިޒް އަދި ޢިލްމީ' : 'Quiz & Knowledge'}
            </span>
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {quizAttempts}
            </span>
            <span className="text-[11px] text-amber-400 font-semibold">
              {quizAttempts > 0 ? `${quizAccuracy}% ${isDh ? 'ރަނގަޅު' : 'accuracy'}` : (isDh ? 'ސުވާލު' : 'answers')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>{isDh ? `ލަކީ ޑްރޯ ކާމިޔާބީ: ${quizWins}` : `Lucky Draw Wins: ${quizWins}`}</span>
          </div>
        </div>

        {/* Pillar 3: Financial & Dues Compliance */}
        <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-2 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isDh ? 'ފީގެ ޤަވާޢިދު' : 'Dues Standing'}
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-xs font-black border ${
              isDuesUpToDate
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}>
              {isDuesUpToDate
                ? (isDh ? 'ގަވާއިދުން ދައްކާފައި' : 'In Good Standing')
                : (isDh ? 'ފީ ބާކީ އެބައޮތް' : 'Pending Payment')}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
            {isDh
              ? `ދެއްކި ފީ: ${data.budget?.summary?.totalPaid ?? 0} ރުފިޔާ`
              : `Total Paid: ${data.budget?.summary?.totalPaid ?? 0} MVR`}
          </p>
        </div>

        {/* Pillar 4: Honors & Earned Badges */}
        <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-2 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isDh ? 'ޙާޞިލުކުރި ބެޖުތައް' : 'Earned Badges'}
            </span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {badges.length}
            </span>
            <span className="text-[11px] text-purple-400 font-semibold">
              {isDh ? 'ބެޖު ލިބިފައި' : 'badges earned'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 truncate">
            {badges.slice(0, 2).map((b, i) => (
              <span key={b.id || i} className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[9px] truncate">
                {b.title}
              </span>
            ))}
            {badges.length > 2 && (
              <span className="text-[9px] text-slate-500 font-mono">+{badges.length - 2}</span>
            )}
          </div>
        </div>
      </div>

      {/* Badges Display Banner if any */}
      {badges.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center gap-2.5 relative z-10">
          <span className={`text-[11px] font-bold text-slate-400 flex items-center gap-1.5 ${isDh ? 'pl-2.5 border-l' : 'pr-2.5 border-r'} border-slate-800`}>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isDh ? 'ބެޖުތައް:' : 'Badges Earned:'}</span>
          </span>
          {badges.map(badge => (
            <div
              key={badge.id}
              className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              title={badge.description}
            >
              <Award className="w-3 h-3 text-amber-400" />
              <span>{badge.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Modal */}
      {modalOpen && (
        <UserPerformanceModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          userId={data.userId}
          userName={data.fullName || data.username}
        />
      )}
    </div>
  );
};
