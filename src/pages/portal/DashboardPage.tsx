import React, { useEffect, useState } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { MemberDashboardView } from '../../components/portal/MemberDashboardView';
import { ExcoDashboardView } from '../../components/portal/ExcoDashboardView';
import { ClubRulesModal } from '../../components/portal/ClubRulesModal';
import { useAuth } from '../../context/AuthContext';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { api } from '../../services/api';
import { 
  Users, ShieldCheck, History, HelpCircle, FileText, ArrowRight, 
  Trophy, Mail, UserCheck, RefreshCw, CheckCircle2, Clock, Sparkles, Award,
  Calendar, Layers, MessageSquare, LayoutDashboard, BookOpen, Wallet,
  Plus, Eye, TrendingUp, AlertCircle, CheckCircle, ExternalLink
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

const translations = {
  dhivehi: {
    adminDeck: 'އެޑްމިން ކޮމާންޑް ސެންޓަރ',
    excoDeck: 'ހިންގާ ކޮމިޓީ ޕެނަލް (EXCO)',
    memberDeck: 'މެންބަރުންގެ ޕެނަލް (Member)',
    welcomeAdmin: 'އެޑްމިން ޕޯޓަލް އަށް މަރުޙަބާ',
    welcomeSub: 'ކްލަބުގެ ރަމަޟާން ކުއިޒް، މެންބަރުންގެ ދަފްތަރު، ޕަބްލިކް ވެބްސައިޓް، ބަޖެޓާއި ފައިސާ އަދި ޔޫޒަރުންގެ އެކައުންޓްތައް މެނޭޖްކުރެއްވުމަށް ތިރީގައިވާ މޮޑިއުލްތައް ބޭނުންކުރައްވާ.',
    portalBadge: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް ޕޯޓަލް',
    activeQuizBadge: 'ކުއިޒް ކުރިއަށްދަނީ',
    viewRules: 'ކްލަބް ޤަވާޢިދު',
    refresh: 'އާކޮށްލާ',
    quickActionsTitle: 'އަވަސް ފިޔަވަޅުތައް (Quick Actions)',
    newQuiz: 'އައު ސުވާލެއް ލުމަށް',
    newMember: 'މެންބަރަކު ރަޖިސްޓްރީކުރުމަށް',
    logBudget: 'ފައިސާގެ މުޢާމަލާތް',
    inboxReview: 'އިންބޮކްސް ބެއްލެވުން',
    manageUsers: 'ޔޫޒަރުން & ރޯލްތައް',
    modulesTitle: 'މައިގަނޑު މޮޑިއުލްތައް (System Modules)',
    recentWinnersTitle: 'އެންމެ ފަހުގެ ނަސީބުވެރިން',
    allWinners: 'ހުރިހާ ނަސީބުވެރިން',
    noWinners: 'އެންމެ ފަހުގެ ނަސީބުވެރިއެއް ނެތް.',
    recentAuditTitle: 'އެންމެ ފަހުގެ އޮޑިޓް ލޮގްތައް',
    allAuditLogs: 'ހުރިހާ ލޮގްތައް',
    noAuditLogs: 'އޮޑިޓް ލޮގެއް ނެތް.',
    openModule: 'ވަޑައިގަންނަވާ',
    viewRulesBtn: 'ޤަވާޢިދު ބައްލަވާ',
    statQuestions: 'ކުއިޒް ސުވާލު',
    statQuestionsSub: 'ޖުމްލަ ސުވާލުތައް',
    statParticipants: 'ބައިވެރިން',
    statParticipantsSub: 'ރަނގަޅު ޖަވާބު',
    statWinners: 'ނަސީބުވެރިން',
    statWinnersSub: 'ހޮވުނު ނަސީބުވެރިން',
    statMembers: 'މެންބަރުން',
    statMembersSub: 'ރެޖިސްޓަރީވި މެންބަރުން',
    statMessages: 'މެސެޖު / ސިޓީ',
    statMessagesSub: 'އިންބޮކްސް ރެކޯޑު',
    statUsers: 'ޔޫޒަރުން',
    statUsersSub: 'އެކްޓިވް އެކައުންޓް'
  },
  english: {
    adminDeck: 'Admin Command Center',
    excoDeck: 'EXCO Executive Panel',
    memberDeck: 'Member Self-Service Panel',
    welcomeAdmin: 'Welcome to Admin Portal',
    welcomeSub: 'Manage club activities, Ramadan quiz questions, membership directories, financial accounts, public website content, and role-based user permissions.',
    portalBadge: 'Ananda Recreation Club Portal',
    activeQuizBadge: 'Quiz is Live',
    viewRules: 'Club Bylaws',
    refresh: 'Refresh',
    quickActionsTitle: 'Quick Management Actions',
    newQuiz: 'Manage Ramadan Quiz',
    newMember: 'Register Member',
    logBudget: 'Record Budget / Dues',
    inboxReview: 'Review Inbox Messages',
    manageUsers: 'Users & Roles',
    modulesTitle: 'Core Management Modules',
    recentWinnersTitle: 'Recent Lucky Draw Winners',
    allWinners: 'All Winners',
    noWinners: 'No recent winners found.',
    recentAuditTitle: 'Recent System Audit Trails',
    allAuditLogs: 'All Logs',
    noAuditLogs: 'No audit records logged yet.',
    openModule: 'Open Module',
    viewRulesBtn: 'View Bylaws',
    statQuestions: 'Quiz Questions',
    statQuestionsSub: 'Total Question Bank',
    statParticipants: 'Participants',
    statParticipantsSub: 'Correct Answers',
    statWinners: 'Lucky Winners',
    statWinnersSub: 'Drawn Winners',
    statMembers: 'Club Members',
    statMembersSub: 'Registered Registry',
    statMessages: 'Inquiries / Letters',
    statMessagesSub: 'Pending In Inbox',
    statUsers: 'Staff Users',
    statUsersSub: 'Active Accounts'
  }
};

export const DashboardPage: React.FC = () => {
  const { user, refreshUser, hasPermission } = useAuth();
  const { lang, dir } = usePortalLanguage();
  const t = translations[lang] || translations.dhivehi;

  const isAdmin = Boolean(user && (
    user.roleName === 'Admin' ||
    user.roleId === 'role_admin' ||
    user.roleName?.toLowerCase().includes('admin')
  ));
  const isExco = Boolean(user && (
    user.roleName === 'EXCO Member' ||
    user.roleId === 'role_exco' ||
    user.roleName?.toLowerCase().includes('exco')
  ));
  const isStandardMemberOrUser = !isAdmin && !isExco;

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user, isAdmin]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (!user) return null;

  const dashboardTitle = isStandardMemberOrUser
    ? (lang === 'english' ? "Members Dashboard" : "މެންބަރުގެ ޑޭޝްބޯޑު")
    : isExco
    ? (lang === 'english' ? "EXCO Dashboard" : "ހިންގާ ކޮމިޓީގެ ޑޭޝްބޯޑު")
    : (lang === 'english' ? "Admin Dashboard" : "އެޑްމިން ޑޭޝްބޯޑު");

  return (
    <PortalLayout currentModule="dashboard" title={dashboardTitle}>
      
      {/* Strict Role-based Panel Rendering: No switch mode option */}
      {isStandardMemberOrUser ? (
        <MemberDashboardView user={user} onRefreshUser={refreshUser} />
      ) : isExco ? (
        <ExcoDashboardView user={user} onRefreshUser={refreshUser} />
      ) : loading || !stats ? (
        <div className="py-20 text-center space-y-3" dir={dir}>
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">{lang === 'english' ? 'Loading admin command metrics...' : 'ޑޭޝްބޯޑު މައުލޫމާތު ލޯޑުވަނީ...'}</p>
        </div>
      ) : (
        <div className="space-y-8" dir={dir}>
          {/* Top Banner: Admin Command Overview */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="space-y-3 relative z-10 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-bold text-xs uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{t.portalBadge}</span>
                    </span>
                    {stats.activeQuiz && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{t.activeQuizBadge} (#{stats.activeQuiz.questionNumber})</span>
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
                    {t.welcomeAdmin}
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {t.welcomeSub}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowRulesModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{t.viewRules}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 text-orange-400 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>{t.refresh}</span>
                  </button>
                </div>
              </div>

              {/* Quick Actions Ribbon */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  <span>{t.quickActionsTitle}</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <a
                    href="/portal/ramazan-quiz"
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-850 transition-all text-xs font-bold text-slate-200 hover:text-white group"
                  >
                    <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <span className="truncate">{t.newQuiz}</span>
                  </a>

                  <a
                    href="/portal/members"
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 transition-all text-xs font-bold text-slate-200 hover:text-white group"
                  >
                    <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <span className="truncate">{t.newMember}</span>
                  </a>

                  <a
                    href="/portal/budget"
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition-all text-xs font-bold text-slate-200 hover:text-white group"
                  >
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <span className="truncate">{t.logBudget}</span>
                  </a>

                  <a
                    href="/portal/messages"
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 hover:bg-slate-850 transition-all text-xs font-bold text-slate-200 hover:text-white group"
                  >
                    <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="truncate">{t.inboxReview}</span>
                  </a>

                  <a
                    href="/portal/users"
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-850 transition-all text-xs font-bold text-slate-200 hover:text-white group"
                  >
                    <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="truncate">{t.manageUsers}</span>
                  </a>
                </div>
              </div>

              {/* Key Metric Overview Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5 shadow-md">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">{t.statQuestions}</span>
                    <HelpCircle className="w-4 h-4 text-orange-400" />
                  </div>
                  <p className="text-2xl font-bold text-white font-mono">{stats.totalQuestions || 0}</p>
                  <p className="text-[10px] text-slate-500">{t.statQuestionsSub}</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5 shadow-md">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">{t.statParticipants}</span>
                    <Users className="w-4 h-4 text-sky-400" />
                  </div>
                  <p className="text-2xl font-bold text-white font-mono">{stats.totalParticipants || 0}</p>
                  <p className="text-[10px] text-emerald-400 font-semibold">{stats.correctParticipants || 0} {t.statParticipantsSub}</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5 shadow-md">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">{t.statWinners}</span>
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-bold text-white font-mono">{stats.totalWinners || 0}</p>
                  <p className="text-[10px] text-slate-500">{t.statWinnersSub}</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5 shadow-md">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">{t.statMembers}</span>
                    <UserCheck className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-2xl font-bold text-white font-mono">{stats.totalMembers || 0}</p>
                  <p className="text-[10px] text-slate-500">{t.statMembersSub}</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5 shadow-md">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">{t.statMessages}</span>
                    <MessageSquare className="w-4 h-4 text-rose-400" />
                  </div>
                  <p className="text-2xl font-bold text-white font-mono">{stats.pendingMessages || 0}</p>
                  <p className="text-[10px] text-rose-400 font-semibold">{t.statMessagesSub}</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5 shadow-md">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">{t.statUsers}</span>
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-white font-mono">{stats.activeUsers || 0}</p>
                  <p className="text-[10px] text-slate-500">{t.statUsersSub}</p>
                </div>
              </div>

              {/* Core Navigation Gateway Cards */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold font-heading text-white">{t.modulesTitle}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                  
                  <a
                    href="/portal/ramazan-quiz"
                    className="bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-5 transition-all hover:scale-[1.02] space-y-3 group shadow-md"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-heading text-white group-hover:text-orange-400 transition-colors">
                        {lang === 'english' ? 'Ramadan Quiz Module' : 'ރަމަޟާން ކުއިޒް މޮޑިއުލް'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {lang === 'english' ? 'Question bank, submissions review, automated lucky draws, and winner records.' : 'ސުވާލުތައް، ބައިވެރިންގެ ޖަވާބުތައް، ނަސީބުވެރިން އަދި ގުރުއަތުލުން.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 pt-1">
                      <span>{t.openModule}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </a>

                  <a
                    href="/portal/members"
                    className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 transition-all hover:scale-[1.02] space-y-3 group shadow-md"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-heading text-white group-hover:text-indigo-400 transition-colors">
                        {lang === 'english' ? 'Members Registry' : 'މެންބަރުންގެ ދަފްތަރު'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {lang === 'english' ? 'Official membership list, EXCO executive team, membership cards, and categories.' : 'ކްލަބުގެ މެންބަރުން، ހިންގާ ކޮމިޓީ އަދި މެންބަރޝިޕް ކެޓަގަރީތައް.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 pt-1">
                      <span>{t.openModule}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </a>

                  <a
                    href="/portal/events-meetings"
                    className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 transition-all hover:scale-[1.02] space-y-3 group shadow-md"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-heading text-white group-hover:text-amber-400 transition-colors">
                        {lang === 'english' ? 'Events & Meetings' : 'ޙަރަކާތްތަކާއި ބައްދަލުވުން'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {lang === 'english' ? 'Club calendars, EXCO meetings, attendance logging, and resolution voting.' : 'ކްލަބް ޙަރަކާތްތައް، ބައްދަލުވުންތައް، ޙާޟިރީ އަދި ވޯޓު ނެގުން.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 pt-1">
                      <span>{t.openModule}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </a>

                  <a
                    href="/portal/budget"
                    className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 transition-all hover:scale-[1.02] space-y-3 group shadow-md"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-heading text-white group-hover:text-emerald-400 transition-colors">
                        {lang === 'english' ? 'Budget & Finance' : 'ބަޖެޓާއި ފައިސާ (Budget)'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {lang === 'english' ? 'Income, expenses, monthly subscription dues tracking, and financial statements.' : 'އާމްދަނީ، ޚަރަދުތައް، މަހު ފީގެ ފަންޑު އަދި މާލީ ބަޔާންތައް.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 pt-1">
                      <span>{t.openModule}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </a>

                  <a
                    href="/portal/users"
                    className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 transition-all hover:scale-[1.02] space-y-3 group shadow-md"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-heading text-white group-hover:text-purple-400 transition-colors">
                        {lang === 'english' ? 'Users & Permissions' : 'ޔޫޒަރުން & ޕަރމިޝަންސް'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {lang === 'english' ? 'Admin accounts, custom roles, password resets, and module permissions matrix.' : 'އެޑްމިން އެކައުންޓްތައް، ރޯލްތައް އަދި މޮޑިއުލް ޕަރމިޝަން ގްރިޑް.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 pt-1">
                      <span>{t.openModule}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </a>

                </div>
              </div>

              {/* Activity Feeds Split View */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Recent Winners Feed */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>{t.recentWinnersTitle}</span>
                    </h3>
                    <a href="/portal/ramazan-quiz?tab=winners" className="text-xs text-orange-400 hover:underline font-semibold">
                      {t.allWinners}
                    </a>
                  </div>

                  {stats.recentWinners && stats.recentWinners.length > 0 ? (
                    <div className="space-y-2.5">
                      {stats.recentWinners.map((w: any) => (
                        <div key={w.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">
                                {lang === 'english' ? `Participant #${w.participantNumber}` : `ނަންބަރު: ${w.participantNumber}`}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-semibold text-[10px]">
                                {w.prizeTitle || (lang === 'english' ? 'Prize' : 'އިނާމު')}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {lang === 'english' ? `ID: ${w.maskedIdNumber}` : `އައިޑީ: ${w.maskedIdNumber}`}
                            </p>
                          </div>
                          <span className="text-slate-500 font-mono text-[10px]">{formatDateTime(w.selectedAt)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-6 text-center">{t.noWinners}</p>
                  )}
                </div>

                {/* Recent System Audit Logs */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                      <History className="w-4 h-4 text-sky-400" />
                      <span>{t.recentAuditTitle}</span>
                    </h3>
                    <a href="/portal/audit-logs" className="text-xs text-sky-400 hover:underline font-semibold">
                      {t.allAuditLogs}
                    </a>
                  </div>

                  {stats.recentAuditLogs && stats.recentAuditLogs.length > 0 ? (
                    <div className="space-y-2.5">
                      {stats.recentAuditLogs.slice(-5).reverse().map((a: any) => (
                        <div key={a.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{a.fullName || a.username}</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                                {a.action}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">{a.module}</p>
                          </div>
                          <span className="text-slate-500 font-mono text-[10px]">{formatDateTime(a.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-6 text-center">{t.noAuditLogs}</p>
                  )}
                </div>

              </div>

        </div>
      )}

      <ClubRulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />
    </PortalLayout>
  );
};

export default DashboardPage;
