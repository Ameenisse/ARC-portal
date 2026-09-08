import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { MemberDashboardView } from '../../components/portal/MemberDashboardView';
import { ExcoDashboardView } from '../../components/portal/ExcoDashboardView';
import { ClubRulesModal } from '../../components/portal/ClubRulesModal';
import { useAuth } from '../../context/AuthContext';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { useTableSync } from '../../hooks/useRealtimeSync';
import { api } from '../../services/api';
import { 
  Users, ShieldCheck, History, HelpCircle, FileText, ArrowRight, 
  Trophy, Mail, UserCheck, RefreshCw, CheckCircle2, Clock, Sparkles, Award,
  Calendar, Layers, MessageSquare, LayoutDashboard, BookOpen, Wallet, HeartPulse, CreditCard
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

export const DashboardPage: React.FC = () => {
  const { user, refreshUser, hasPermission } = useAuth();
  const { lang, dir } = usePortalLanguage();
  const isDh = lang === 'dhivehi';

  const isAdmin = Boolean(user && (
    user.roleName === 'Admin' ||
    user.roleId === 'role_admin' ||
    user.roleName?.toLowerCase().includes('admin')
  ));
  const isExco = Boolean(user && !isAdmin && (
    user.roleId === 'role_exco' ||
    user.roleId === 'role_president' ||
    user.roleId === 'role_vp' ||
    user.roleId === 'role_treasurer' ||
    user.roleId === 'role_secretary' ||
    user.roleId === 'role_health_promotion' ||
    ['role_president', 'role_vp', 'role_treasurer', 'role_secretary', 'role_health_promotion', 'role_exco'].includes(user.roleId || '') ||
    user.roleName === 'EXCO Member' ||
    user.roleName === 'President' ||
    user.roleName === 'Vice President' ||
    user.roleName === 'Treasurer' ||
    user.roleName === 'Secretary' ||
    user.roleName === 'Health Promotion Officer' ||
    user.roleName?.toLowerCase().includes('president') ||
    user.roleName?.toLowerCase().includes('treasurer') ||
    user.roleName?.toLowerCase().includes('secretary') ||
    user.roleName?.toLowerCase().includes('health') ||
    user.roleName?.toLowerCase().includes('promotion') ||
    user.roleName?.toLowerCase().includes('exco') ||
    user.designation?.toLowerCase().includes('president') ||
    user.designation?.toLowerCase().includes('treasurer') ||
    user.designation?.toLowerCase().includes('secretary') ||
    user.designation?.toLowerCase().includes('health') ||
    user.designation?.toLowerCase().includes('promotion')
  ));
  const isClubMember = Boolean(user && (
    user.roleName === 'Club Member' ||
    user.roleId === 'role_member'
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

  // Real-time table sync for Dashboard
  useTableSync(['dashboard', 'stats', 'members', 'clubMembers', 'events', 'quiz_questions', 'quiz_submissions', 'budget', 'users', 'inboxMessages'], () => {
    if (user && isAdmin) {
      fetchStats();
    }
    // Also refresh user data in case permissions/profile changed
    refreshUser();
  });

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (!user) return null;

  const dashboardTitle = isStandardMemberOrUser
    ? (isDh ? "މެންބަރުގެ ޑޭޝްބޯޑު" : "Member's Dashboard")
    : isExco
    ? (isDh ? "ހިންގާ ކޮމިޓީގެ ޑޭޝްބޯޑު" : "EXCO Committee Dashboard")
    : (isDh ? "އެޑްމިން ޑޭޝްބޯޑު" : "Admin Dashboard");

  return (
    <PortalLayout currentModule="dashboard" title={dashboardTitle}>
      
      {/* Render Direct View based on role */}
      {isStandardMemberOrUser ? (
        <MemberDashboardView user={user} onRefreshUser={refreshUser} />
      ) : isExco ? (
        <ExcoDashboardView user={user} onRefreshUser={refreshUser} />
      ) : loading || !stats ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 text-sm">
            {isDh ? "ޑޭޝްބޯޑު މައުލޫމާތު ލޯޑުވަނީ..." : "Loading dashboard analytics..."}
          </p>
        </div>
      ) : (
        <div className="space-y-8" dir={dir}>
          
          {/* Welcome Banner & Quick Actions */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 relative z-10 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-semibold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isDh ? "އާނަންދާ ރީކްރިއޭޝަން ކްލަބް ޕޯޓަލް" : "Ananda Recreation Club Portal"}</span>
                </span>
                {stats.activeQuiz && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {isDh
                        ? `ކުއިޒް ކުރިއަށްދަނީ (#${stats.activeQuiz.questionNumber})`
                        : `Live Quiz Active (#${stats.activeQuiz.questionNumber})`}
                    </span>
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
                {isDh ? "އެޑްމިން ޕޯޓަލް އަށް މަރުޙަބާ" : "Welcome to Admin Portal"}
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                {isDh
                  ? "ކްލަބުގެ ރަމަޟާން ކުއިޒް، މެންބަރުންގެ ދަފްތަރު، ޕަބްލިކް ވެބްސައިޓް އަދި ޔޫޒަރުންގެ އެކައުންޓްތައް މެނޭޖްކުރެއްވުމަށް ތިރީގައިވާ މޮޑިއުލްތައް ބޭނުންކުރައްވާ."
                  : "Manage club programs, Ramazan quiz competitions, member rosters, public content, and administrative permissions using the modules below."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-end md:self-center">
              <Link
                to="/portal/budget"
                id="admin-banner-pay-fee-btn"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
              >
                <CreditCard className="w-4 h-4" />
                <span>{isDh ? "ފީ ދައްކަވާ" : "Pay Fee / Dues"}</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>{isDh ? "ކްލަބް ޤަވާޢިދު ބައްލަވާ" : "Club Rules"}</span>
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-orange-400 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{isDh ? "އާކޮށްލާ" : "Refresh"}</span>
              </button>
            </div>
          </div>

          {/* Module-Wise Status Cards Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-400" />
                <span>{isDh ? "މޮޑިއުލްތަކުގެ ޙާލަތު (Module-Wise Status Overview)" : "Module-Wise Status Overview"}</span>
              </h3>
              <span className="text-xs text-slate-400">
                {isDh ? "ލައިވް އަދާހަމަ" : "Live Real-Time Sync"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              
              {/* MODULE 1: Ramazan Quiz */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-orange-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-sm flex flex-col justify-between group">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                      <Trophy className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading group-hover:text-orange-400 transition-colors">
                        {isDh ? "ރަމަޟާން ކުއިޒް" : "Ramazan Quiz"}
                      </h4>
                      <p className="text-[11px] text-slate-400">Ramazan Quiz Module</p>
                    </div>
                  </div>
                  <a
                    href="/portal/ramazan-quiz"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-orange-400 hover:bg-slate-700 transition-all text-xs flex items-center gap-1 font-semibold"
                    title={isDh ? "ކުއިޒް މެނޭޖްމަންޓް" : "Quiz Management"}
                  >
                    <span>{isDh ? "ބައްލަވާ" : "View"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "ޖުމްލަ ސުވާލު" : "Questions"}
                    </span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalQuizQuestions || stats.totalQuestions || 0}</p>
                    <span className="text-[9px] text-orange-400 font-bold block truncate">
                      {stats.activeQuizQuestions || 0} {isDh ? "އެކްޓިވް" : "Active"}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "ބައިވެރިން" : "Participants"}
                    </span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalQuizParticipants || stats.totalParticipants || 0}</p>
                    <span className="text-[9px] text-emerald-400 font-bold block truncate">
                      {stats.correctQuizParticipants || stats.correctParticipants || 0} {isDh ? "ރަނގަޅު" : "Correct"}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "ނަސީބުވެރިން" : "Winners"}
                    </span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalQuizWinners || stats.totalWinners || 0}</p>
                    <span className="text-[9px] text-amber-400 font-bold block truncate">
                      {stats.collectedPrizes || 0} {isDh ? "ޙަވާލުކުރެވުނު" : "Claimed"}
                    </span>
                  </div>
                </div>
              </div>

              {/* MODULE 2: Members Directory */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-sm flex flex-col justify-between group">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                      <UserCheck className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading group-hover:text-indigo-400 transition-colors">
                        {isDh ? "މެންބަރުންގެ ދަފްތަރު" : "Members Directory"}
                      </h4>
                      <p className="text-[11px] text-slate-400">Membership Management</p>
                    </div>
                  </div>
                  <a
                    href="/portal/members"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 transition-all text-xs flex items-center gap-1 font-semibold"
                    title={isDh ? "މެންބަރުން ބައްލަވާ" : "View Members"}
                  >
                    <span>{isDh ? "ބައްލަވާ" : "View"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "ޖުމްލަ މެންބަރުން" : "Total Members"}
                    </span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalMembers || 0}</p>
                    <span className="text-[9px] text-indigo-400 font-bold block truncate">
                      {isDh ? "ދަފްތަރުގައި" : "Enrolled"}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "އެކްޓިވް" : "Active"}
                    </span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.activeMembers || 0}</p>
                    <span className="text-[9px] text-emerald-400 font-bold block truncate">
                      {isDh ? "ސައްޙަ" : "Verified"}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "ހިންގާ ކޮމިޓީ" : "Executive"}
                    </span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalExco || 0}</p>
                    <span className="text-[9px] text-sky-400 font-bold block truncate">EXCO</span>
                  </div>
                </div>
              </div>

              {/* MODULE 3: Budget & Finance */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-sm flex flex-col justify-between group">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <Wallet className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading group-hover:text-emerald-400 transition-colors">
                        {isDh ? "މާލީ ބަޖެޓާއި ފައިސާ" : "Budget & Finance"}
                      </h4>
                      <p className="text-[11px] text-slate-400">Budget & Finance Module</p>
                    </div>
                  </div>
                  <a
                    href="/portal/budget"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-all text-xs flex items-center gap-1 font-semibold"
                    title={isDh ? "ބަޖެޓް ބައްލަވާ" : "View Budget"}
                  >
                    <span>{isDh ? "ބައްލަވާ" : "View"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "ޖުމްލަ އާމްދަނީ" : "Income"}
                    </span>
                    <p className="text-lg sm:text-xl font-extrabold text-emerald-400 font-mono truncate">
                      {stats.totalIncome || stats.budget?.totalIncome ? `${Number(stats.totalIncome || stats.budget?.totalIncome).toLocaleString()}` : '0'}
                    </p>
                    <span className="text-[9px] text-emerald-500 font-bold block truncate">
                      {isDh ? "MVR ލިބުނު" : "MVR In"}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "ޖުމްލަ ޚަރަދު" : "Expenses"}
                    </span>
                    <p className="text-lg sm:text-xl font-extrabold text-rose-400 font-mono truncate">
                      {stats.totalExpenses || stats.budget?.totalExpenses ? `${Number(stats.totalExpenses || stats.budget?.totalExpenses).toLocaleString()}` : '0'}
                    </p>
                    <span className="text-[9px] text-rose-500 font-bold block truncate">
                      {isDh ? "MVR ހިނގި" : "MVR Out"}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "ސާފު ބާކީ" : "Net Balance"}
                    </span>
                    <p className={`text-lg sm:text-xl font-extrabold font-mono truncate ${
                      (stats.netBalance ?? stats.budget?.netBalance ?? 0) >= 0 ? 'text-white' : 'text-rose-400'
                    }`}>
                      {stats.netBalance ?? stats.budget?.netBalance ? `${Number(stats.netBalance ?? stats.budget?.netBalance).toLocaleString()}` : '0'}
                    </p>
                    <span className="text-[9px] text-teal-400 font-bold block truncate">MVR Net</span>
                  </div>
                </div>
              </div>

              {/* MODULE 4: Events & Meetings */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-sm flex flex-col justify-between group">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <Calendar className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading group-hover:text-emerald-400 transition-colors">
                        {isDh ? "ހަރަކާތްތަކާއި ބައްދަލުވުންތައް" : "Events & Meetings"}
                      </h4>
                      <p className="text-[11px] text-slate-400">Events & Meetings</p>
                    </div>
                  </div>
                  <a
                    href="/portal/events"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-all text-xs flex items-center gap-1 font-semibold"
                    title={isDh ? "ހަރަކާތްތައް ބައްލަވާ" : "View Events"}
                  >
                    <span>{isDh ? "ބައްލަވާ" : "View"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "ޖުމްލަ ހަރަކާތް" : "Events"}
                    </span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalEvents || 0}</p>
                    <span className="text-[9px] text-emerald-400 font-bold block truncate">
                      {stats.upcomingEvents || 0} {isDh ? "ކުރިއަށް އޮތް" : "Upcoming"}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "ބައްދަލުވުން" : "Meetings"}
                    </span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalMeetings || 0}</p>
                    <span className="text-[9px] text-teal-400 font-bold block truncate">
                      {stats.upcomingMeetings || 0} {isDh ? "ތާވަލުވި" : "Scheduled"}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "ނިމިފައިވާ" : "Completed"}
                    </span>
                    <p className="text-xl font-extrabold text-white font-mono">{(stats.completedEvents || 0) + (stats.completedMeetings || 0)}</p>
                    <span className="text-[9px] text-slate-500 font-bold block truncate">
                      {isDh ? "ރެކޯޑުކުރެވުނު" : "Logged"}
                    </span>
                  </div>
                </div>
              </div>

              {/* MODULE 5: Inbox & Action Records */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-sm flex flex-col justify-between group">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                      <Mail className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading group-hover:text-rose-400 transition-colors">
                        {isDh ? "އިންބޮކްސް & އެކްޝަން ރެކޯޑު" : "Inbox & Inquiries"}
                      </h4>
                      <p className="text-[11px] text-slate-400">Inquiries & Action Records</p>
                    </div>
                  </div>
                  <a
                    href="/portal/contact"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-all text-xs flex items-center gap-1 font-semibold"
                    title={isDh ? "އިންބޮކްސް ބައްލަވާ" : "View Inbox"}
                  >
                    <span>{isDh ? "ބައްލަވާ" : "View"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "ޖުމްލަ މެސެޖު" : "Inquiries"}
                    </span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalMessages || 0}</p>
                    <span className="text-[9px] text-slate-500 font-bold block truncate">
                      {isDh ? "ލިބުނު" : "Received"}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "ފިޔަވަޅު އަޅަންޖެހޭ" : "Action Req."}
                    </span>
                    <p className="text-xl font-extrabold text-rose-400 font-mono">{stats.unreadMessages || stats.pendingMessages || 0}</p>
                    <span className="text-[9px] text-rose-400 font-bold block truncate">Pending Action</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "ފިޔަވަޅު އެޅިފައި" : "Resolved"}
                    </span>
                    <p className="text-xl font-extrabold text-emerald-400 font-mono">{stats.resolvedMessages || 0}</p>
                    <span className="text-[9px] text-emerald-400 font-bold block truncate">Resolved</span>
                  </div>
                </div>
              </div>

              {/* MODULE 6: Users & Access */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-sm flex flex-col justify-between group">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                      <ShieldCheck className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading group-hover:text-purple-400 transition-colors">
                        {isDh ? "ޔޫޒަރުން & ޕަރމިޝަންސް" : "Users & Permissions"}
                      </h4>
                      <p className="text-[11px] text-slate-400">Users & Access Control</p>
                    </div>
                  </div>
                  <a
                    href="/portal/users"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-purple-400 hover:bg-slate-700 transition-all text-xs flex items-center gap-1 font-semibold"
                    title={isDh ? "ޔޫޒަރުން ބައްލަވާ" : "View Users"}
                  >
                    <span>{isDh ? "ބައްލަވާ" : "View"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "ޖުމްލަ ޔޫޒަރުން" : "Accounts"}
                    </span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalUsers || 0}</p>
                    <span className="text-[9px] text-purple-400 font-bold block truncate">
                      {isDh ? "އެކައުންޓް" : "Registered"}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "އެކްޓިވް" : "Active"}
                    </span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.activeUsers || 0}</p>
                    <span className="text-[9px] text-emerald-400 font-bold block truncate">Active</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isDh ? "އެޑްމިނިސްޓްރޭޓަރުން" : "Admins"}
                    </span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.adminUsers || 1}</p>
                    <span className="text-[9px] text-amber-400 font-bold block truncate">Admins</span>
                  </div>
                </div>
              </div>

              {/* MODULE 7: Quick Short-Links & Actions */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition-all shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                      <LayoutDashboard className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading">
                        {isDh ? "އަވަސް ލިންކުތައް" : "Quick Shortcuts"}
                      </h4>
                      <p className="text-[11px] text-slate-400">Quick Portal Shortcuts</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href="/portal/quiz-winners"
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/50 hover:bg-slate-800/60 transition-all flex items-center gap-2 text-slate-300 hover:text-white"
                  >
                    <Award className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-semibold truncate">
                      {isDh ? "ނަސީބުވެރިންގެ ލިސްޓު" : "Winners List"}
                    </span>
                  </a>
                  <a
                    href="/portal/quiz-participants"
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-sky-500/50 hover:bg-slate-800/60 transition-all flex items-center gap-2 text-slate-300 hover:text-white"
                  >
                    <Users className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="text-xs font-semibold truncate">
                      {isDh ? "ބައިވެރިންގެ ދަފްތަރު" : "Participants"}
                    </span>
                  </a>
                  <a
                    href="/portal/budget"
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all flex items-center gap-2 text-slate-300 hover:text-white"
                  >
                    <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold truncate">
                      {isDh ? "މާލީ ބަޖެޓް" : "Financial Budget"}
                    </span>
                  </a>
                  <a
                    href="/portal/audit-logs"
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/50 hover:bg-slate-800/60 transition-all flex items-center gap-2 text-slate-300 hover:text-white"
                  >
                    <History className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-xs font-semibold truncate">
                      {isDh ? "އޮޑިޓް ލޮގް" : "Audit Trail"}
                    </span>
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* Core Navigation Gateway Cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold font-heading text-white">
              {isDh ? "މުހިންމު މޮޑިއުލްތައް" : "Core System Modules"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              <a
                href="/portal/ramazan-quiz"
                className="bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-5 transition-all hover:scale-[1.02] space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-heading text-white group-hover:text-orange-400 transition-colors">
                    {isDh ? "ރަމަޟާން ކުއިޒް މޮޑިއުލް" : "Ramazan Quiz"}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {isDh
                      ? "ސުވާލުތައް، ބައިވެރިންގެ ޖަވާބުތައް، ނަސީބުވެރިން އަދި ގުރުއަތުލުން."
                      : "Daily Ramadan questions, submissions, scoring, and automated winner draws."}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 pt-1">
                  <span>{isDh ? "ވަޑައިގަންނަވާ" : "Open Module"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </a>

              <a
                href="/portal/members"
                className="bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-5 transition-all hover:scale-[1.02] space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-heading text-white group-hover:text-indigo-400 transition-colors">
                    {isDh ? "މެންބަރުންގެ ދަފްތަރު" : "Members Directory"}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {isDh
                      ? "ކްލަބުގެ މެންބަރުން، ހިންގާ ކޮމިޓީ އަދި މެންބަރޝިޕް ކެޓަގަރީތައް."
                      : "Club membership registry, executive committee details, and categories."}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 pt-1">
                  <span>{isDh ? "ވަޑައިގަންނަވާ" : "Open Module"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </a>

              <a
                href="/portal/contact"
                className="bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-5 transition-all hover:scale-[1.02] space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-heading text-white group-hover:text-rose-400 transition-colors">
                    {isDh ? "އިންބޮކްސް & އެކްޝަން ރެކޯޑު" : "Inbox & Inquiries"}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {isDh
                      ? "މެސެޖުތައް ބެއްލެވުން، އެކްޝަން ރެކޯޑު އެޅުން އަދި ފިޔަވަޅުތައް."
                      : "Public inquiry messages, action logging, and response follow-ups."}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 pt-1">
                  <span>{isDh ? "ވަޑައިގަންނަވާ" : "Open Module"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </a>

              <a
                href="/portal/users"
                className="bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-5 transition-all hover:scale-[1.02] space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-heading text-white group-hover:text-purple-400 transition-colors">
                    {isDh ? "ޔޫޒަރުން & ޕަރމިޝަންސް" : "Users & Permissions"}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {isDh
                      ? "އެޑްމިން އެކައުންޓްތައް، ރޯލްތައް އަދި މޮޑިއުލް ޕަރމިޝަން ގްރިޑް."
                      : "System portal logins, RBAC roles, and module permission matrix."}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 pt-1">
                  <span>{isDh ? "ވަޑައިގަންނަވާ" : "Open Module"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </a>

              {(isAdmin || hasPermission('budget', 'canView')) && (
                <a
                  href="/portal/budget"
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 transition-all hover:scale-[1.02] space-y-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold font-heading text-white group-hover:text-emerald-400 transition-colors">
                      {isDh ? "ބަޖެޓާއި ފައިސާ (Budget)" : "Budget & Accounts"}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {isDh
                        ? "އާމްދަނީ، ޚަރަދުތައް، މަހު ފީގެ ފަންޑު އަދި މާލީ ބަޔާންތައް."
                        : "Revenue collection, expenses, membership dues, and fiscal statements."}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 pt-1">
                    <span>{isDh ? "ވަޑައިގަންނަވާ" : "Open Module"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </a>
              )}

              {(isAdmin || hasPermission('health_awareness', 'canView') || hasPermission('content', 'canView')) && (
                <a
                  href="/portal/health-awareness"
                  className="bg-slate-900 border border-slate-800 hover:border-teal-500/50 rounded-2xl p-5 transition-all hover:scale-[1.02] space-y-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold font-heading text-white group-hover:text-teal-400 transition-colors">
                      {isDh ? "ޞިއްޙީ ހޭލުންތެރިކަން" : "Health Awareness"}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {isDh
                        ? "ޞިއްޙީ އިރުޝާދުތައް، ދުޅަހެޔޮކަމުގެ މަޢުލޫމާތު އަދި ބްލޮގް ލިޔުންތައް."
                        : "Wellness guidelines, medical advice, and community health blog posts."}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400 pt-1">
                    <span>{isDh ? "ވަޑައިގަންނަވާ" : "Open Module"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </a>
              )}

              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className={`bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 transition-all hover:scale-[1.02] space-y-3 group ${isDh ? 'text-right' : 'text-left'} cursor-pointer`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-heading text-white group-hover:text-amber-400 transition-colors">
                    {isDh ? "ކްލަބް ޤަވާޢިދު" : "Club Bylaws & Rules"}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {isDh
                      ? "އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ ހިންގާ ޤަވާޢިދާއި އުޞޫލުތައް ބައްލަވާލެއްވުން."
                      : "Official club governing constitution, code of conduct, and regulations."}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 pt-1">
                  <span>{isDh ? "ޤަވާޢިދު ބައްލަވާ" : "View Bylaws"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          </div>

          {/* Activity Feeds Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Recent Winners Feed */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>{isDh ? "އެންމެ ފަހުގެ ނަސީބުވެރިން" : "Latest Quiz Winners"}</span>
                </h3>
                <a href="/portal/ramazan-quiz?tab=winners" className="text-xs text-orange-400 hover:underline font-semibold">
                  {isDh ? "ހުރިހާ ނަސީބުވެރިން" : "All Winners"}
                </a>
              </div>

              {stats.recentWinners && stats.recentWinners.length > 0 ? (
                <div className="space-y-2.5">
                  {stats.recentWinners.map((w: any) => (
                    <div key={w.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">
                            {isDh ? `ނަންބަރު: ${w.participantNumber}` : `No: ${w.participantNumber}`}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-semibold text-[10px]">
                            {w.prizeTitle || (isDh ? 'އިނާމު' : 'Prize')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {isDh ? `އައިޑީ: ${w.maskedIdNumber}` : `ID: ${w.maskedIdNumber}`}
                        </p>
                      </div>
                      <span className="text-slate-500 font-mono text-[10px]">{formatDateTime(w.selectedAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-6 text-center">
                  {isDh ? "އެންމެ ފަހުގެ ނަސީބުވެރިއެއް ނެތް." : "No recent winners recorded yet."}
                </p>
              )}
            </div>

            {/* Recent System Audit Logs - Admin Panel Only */}
            {isAdmin && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-sky-400" />
                    <span>{isDh ? "އެންމެ ފަހުގެ އޮޑިޓް ލޮގްތައް" : "Recent Audit Trails"}</span>
                  </h3>
                  <a href="/portal/audit-logs" className="text-xs text-sky-400 hover:underline font-semibold">
                    {isDh ? "ހުރިހާ ލޮގްތައް" : "All Logs"}
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
                  <p className="text-xs text-slate-500 py-6 text-center">
                    {isDh ? "އޮޑިޓް ލޮގެއް ނެތް." : "No audit activity recorded yet."}
                  </p>
                )}
              </div>
            )}

          </div>

        </div>
      )}

      <ClubRulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />
    </PortalLayout>
  );
};
