import React, { useEffect, useState } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { MemberDashboardView } from '../../components/portal/MemberDashboardView';
import { ExcoDashboardView } from '../../components/portal/ExcoDashboardView';
import { ClubRulesModal } from '../../components/portal/ClubRulesModal';
import { useAuth } from '../../context/AuthContext';
import { useTableSync } from '../../hooks/useRealtimeSync';
import { api } from '../../services/api';
import { 
  Users, ShieldCheck, History, HelpCircle, FileText, ArrowRight, 
  Trophy, Mail, UserCheck, RefreshCw, CheckCircle2, Clock, Sparkles, Award,
  Calendar, Layers, MessageSquare, LayoutDashboard, BookOpen, Wallet
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

export const DashboardPage: React.FC = () => {
  const { user, refreshUser, hasPermission } = useAuth();
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
    ? "މެންބަރުގެ ޑޭޝްބޯޑު"
    : isExco
    ? "ހިންގާ ކޮމިޓީގެ ޑޭޝްބޯޑު"
    : "އެޑްމިން ޑޭޝްބޯޑު";

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
          <p className="text-slate-400 text-sm">ޑޭޝްބޯޑު މައުލޫމާތު ލޯޑުވަނީ...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Welcome Banner & Quick Actions */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 relative z-10 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-semibold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>އާނަންދާ ރީކްރިއޭޝަން ކްލަބް ޕޯޓަލް</span>
                </span>
                {stats.activeQuiz && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ކުއިޒް ކުރިއަށްދަނީ (#{stats.activeQuiz.questionNumber})</span>
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
                އެޑްމިން ޕޯޓަލް އަށް މަރުޙަބާ
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                ކްލަބުގެ ރަމަޟާން ކުއިޒް، މެންބަރުންގެ ދަފްތަރު، ޕަބްލިކް ވެބްސައިޓް އަދި ޔޫޒަރުންގެ އެކައުންޓްތައް މެނޭޖްކުރެއްވުމަށް ތިރީގައިވާ މޮޑިއުލްތައް ބޭނުންކުރައްވާ.
              </p>
            </div>

            <div className="flex items-center gap-3 self-end md:self-center">
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>ކްލަބް ޤަވާޢިދު ބައްލަވާ</span>
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-orange-400 ${refreshing ? 'animate-spin' : ''}`} />
                <span>އާކޮށްލާ</span>
              </button>
            </div>
          </div>

          {/* Module-Wise Status Cards Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-400" />
                <span>މޮޑިއުލްތަކުގެ ޙާލަތު (Module-Wise Status Overview)</span>
              </h3>
              <span className="text-xs text-slate-400">ލައިވް އަދާހަމަ</span>
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
                        ރަމަޟާން ކުއިޒް
                      </h4>
                      <p className="text-[11px] text-slate-400">Ramazan Quiz Module</p>
                    </div>
                  </div>
                  <a
                    href="/portal/ramazan-quiz"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-orange-400 hover:bg-slate-700 transition-all text-xs flex items-center gap-1 font-semibold"
                    title="ކުއިޒް މެނޭޖްމަންޓް"
                  >
                    <span>ބައްލަވާ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">ޖުމްލަ ސުވާލު</span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalQuizQuestions || stats.totalQuestions || 0}</p>
                    <span className="text-[9px] text-orange-400 font-bold block truncate">
                      {stats.activeQuizQuestions || 0} އެކްޓިވް
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">ބައިވެރިން</span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalQuizParticipants || stats.totalParticipants || 0}</p>
                    <span className="text-[9px] text-emerald-400 font-bold block truncate">
                      {stats.correctQuizParticipants || stats.correctParticipants || 0} ރަނގަޅު
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">ނަސީބުވެރިން</span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalQuizWinners || stats.totalWinners || 0}</p>
                    <span className="text-[9px] text-amber-400 font-bold block truncate">
                      {stats.collectedPrizes || 0} ޙަވާލުކުރެވުނު
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
                        މެންބަރުންގެ ދަފްތަރު
                      </h4>
                      <p className="text-[11px] text-slate-400">Membership Management</p>
                    </div>
                  </div>
                  <a
                    href="/portal/members"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 transition-all text-xs flex items-center gap-1 font-semibold"
                    title="މެންބަރުން ބައްލަވާ"
                  >
                    <span>ބައްލަވާ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">ޖުމްލަ މެންބަރުން</span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalMembers || 0}</p>
                    <span className="text-[9px] text-indigo-400 font-bold block truncate">ދަފްތަރުގައި</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">އެކްޓިވް</span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.activeMembers || 0}</p>
                    <span className="text-[9px] text-emerald-400 font-bold block truncate">ސައްޙަ</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">ހިންގާ ކޮމިޓީ</span>
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
                        މާލީ ބަޖެޓާއި ފައިސާ
                      </h4>
                      <p className="text-[11px] text-slate-400">Budget & Finance Module</p>
                    </div>
                  </div>
                  <a
                    href="/portal/budget"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-all text-xs flex items-center gap-1 font-semibold"
                    title="ބަޖެޓް ބައްލަވާ"
                  >
                    <span>ބައްލަވާ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">ޖުމްލަ އާމްދަނީ</span>
                    <p className="text-lg sm:text-xl font-extrabold text-emerald-400 font-mono truncate">
                      {stats.totalIncome || stats.budget?.totalIncome ? `${Number(stats.totalIncome || stats.budget?.totalIncome).toLocaleString()}` : '0'}
                    </p>
                    <span className="text-[9px] text-emerald-500 font-bold block truncate">MVR ލިބުނު</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">ޖުމްލަ ޚަރަދު</span>
                    <p className="text-lg sm:text-xl font-extrabold text-rose-400 font-mono truncate">
                      {stats.totalExpenses || stats.budget?.totalExpenses ? `${Number(stats.totalExpenses || stats.budget?.totalExpenses).toLocaleString()}` : '0'}
                    </p>
                    <span className="text-[9px] text-rose-500 font-bold block truncate">MVR ހިނގި</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">ސާފު ބާކީ</span>
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
                        ހަރަކާތްތަކާއި ބައްދަލުވުންތައް
                      </h4>
                      <p className="text-[11px] text-slate-400">Events & Meetings</p>
                    </div>
                  </div>
                  <a
                    href="/portal/events"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-all text-xs flex items-center gap-1 font-semibold"
                    title="ހަރަކާތްތައް ބައްލަވާ"
                  >
                    <span>ބައްލަވާ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">ޖުމްލަ ހަރަކާތް</span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalEvents || 0}</p>
                    <span className="text-[9px] text-emerald-400 font-bold block truncate">
                      {stats.upcomingEvents || 0} ކުރިއަށް އޮތް
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">ބައްދަލުވުން</span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalMeetings || 0}</p>
                    <span className="text-[9px] text-teal-400 font-bold block truncate">
                      {stats.upcomingMeetings || 0} ތާވަލުވި
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">ނިމިފައިވާ</span>
                    <p className="text-xl font-extrabold text-white font-mono">{(stats.completedEvents || 0) + (stats.completedMeetings || 0)}</p>
                    <span className="text-[9px] text-slate-500 font-bold block truncate">ރެކޯޑުކުރެވުނު</span>
                  </div>
                </div>
              </div>

              {/* MODULE 4: Inbox & Action Records */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-sm flex flex-col justify-between group">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                      <Mail className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading group-hover:text-rose-400 transition-colors">
                        އިންބޮކްސް & އެކްޝަން ރެކޯޑު
                      </h4>
                      <p className="text-[11px] text-slate-400">Inquiries & Action Records</p>
                    </div>
                  </div>
                  <a
                    href="/portal/contact"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-all text-xs flex items-center gap-1 font-semibold"
                    title="އިންބޮކްސް ބައްލަވާ"
                  >
                    <span>ބައްލަވާ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">ޖުމްލަ މެސެޖު</span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalMessages || 0}</p>
                    <span className="text-[9px] text-slate-500 font-bold block truncate">ލިބުނު</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">ފިޔަވަޅު އަޅަންޖެހޭ</span>
                    <p className="text-xl font-extrabold text-rose-400 font-mono">{stats.unreadMessages || stats.pendingMessages || 0}</p>
                    <span className="text-[9px] text-rose-400 font-bold block truncate">Pending Action</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">ފިޔަވަޅު އެޅިފައި</span>
                    <p className="text-xl font-extrabold text-emerald-400 font-mono">{stats.resolvedMessages || 0}</p>
                    <span className="text-[9px] text-emerald-400 font-bold block truncate">Resolved</span>
                  </div>
                </div>
              </div>

              {/* MODULE 5: Users & Access */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-sm flex flex-col justify-between group">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                      <ShieldCheck className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading group-hover:text-purple-400 transition-colors">
                        ޔޫޒަރުން & ޕަރމިޝަންސް
                      </h4>
                      <p className="text-[11px] text-slate-400">Users & Access Control</p>
                    </div>
                  </div>
                  <a
                    href="/portal/users"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-purple-400 hover:bg-slate-700 transition-all text-xs flex items-center gap-1 font-semibold"
                    title="ޔޫޒަރުން ބައްލަވާ"
                  >
                    <span>ބައްލަވާ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">ޖުމްލަ ޔޫޒަރުން</span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.totalUsers || 0}</p>
                    <span className="text-[9px] text-purple-400 font-bold block truncate">އެކައުންޓް</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">އެކްޓިވް</span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.activeUsers || 0}</p>
                    <span className="text-[9px] text-emerald-400 font-bold block truncate">Active</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">އެޑްމިނިސްޓްރޭޓަރުން</span>
                    <p className="text-xl font-extrabold text-white font-mono">{stats.adminUsers || 1}</p>
                    <span className="text-[9px] text-amber-400 font-bold block truncate">Admins</span>
                  </div>
                </div>
              </div>

              {/* MODULE 6: Quick Short-Links & Actions */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition-all shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                      <LayoutDashboard className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading">
                        އަވަސް ލިންކުތައް
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
                    <span className="text-xs font-semibold truncate">ނަސީބުވެރިންގެ ލިސްޓު</span>
                  </a>
                  <a
                    href="/portal/quiz-participants"
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-sky-500/50 hover:bg-slate-800/60 transition-all flex items-center gap-2 text-slate-300 hover:text-white"
                  >
                    <Users className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="text-xs font-semibold truncate">ބައިވެރިންގެ ދަފްތަރު</span>
                  </a>
                  <a
                    href="/portal/budget"
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all flex items-center gap-2 text-slate-300 hover:text-white"
                  >
                    <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold truncate">މާލީ ބަޖެޓް</span>
                  </a>
                  <a
                    href="/portal/audit-logs"
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/50 hover:bg-slate-800/60 transition-all flex items-center gap-2 text-slate-300 hover:text-white"
                  >
                    <History className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-xs font-semibold truncate">އޮޑިޓް ލޮގް</span>
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* Core Navigation Gateway Cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold font-heading text-white">މުހިންމު މޮޑިއުލްތައް</h3>
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
                    ރަމަޟާން ކުއިޒް މޮޑިއުލް
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    ސުވާލުތައް، ބައިވެރިންގެ ޖަވާބުތައް، ނަސީބުވެރިން އަދި ގުރުއަތުލުން.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 pt-1">
                  <span>ވަޑައިގަންނަވާ</span>
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
                    މެންބަރުންގެ ދަފްތަރު
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    ކްލަބުގެ މެންބަރުން، ހިންގާ ކޮމިޓީ އަދި މެންބަރޝިޕް ކެޓަގަރީތައް.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 pt-1">
                  <span>ވަޑައިގަންނަވާ</span>
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
                    އިންބޮކްސް & އެކްޝަން ރެކޯޑު
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    މެސެޖުތައް ބެއްލެވުން، އެކްޝަން ރެކޯޑު އެޅުން އަދި ފިޔަވަޅުތައް.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 pt-1">
                  <span>ވަޑައިގަންނަވާ</span>
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
                    ޔޫޒަރުން & ޕަރމިޝަންސް
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    އެޑްމިން އެކައުންޓްތައް، ރޯލްތައް އަދި މޮޑިއުލް ޕަރމިޝަން ގްރިޑް.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 pt-1">
                  <span>ވަޑައިގަންނަވާ</span>
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
                      ބަޖެޓާއި ފައިސާ (Budget)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      އާމްދަނީ، ޚަރަދުތައް، މަހު ފީގެ ފަންޑު އަދި މާލީ ބަޔާންތައް.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 pt-1">
                    <span>ވަޑައިގަންނަވާ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </a>
              )}

              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 transition-all hover:scale-[1.02] space-y-3 group text-right cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-heading text-white group-hover:text-amber-400 transition-colors">
                    ކްލަބް ޤަވާޢިދު
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ ހިންގާ ޤަވާޢިދާއި އުޞޫލުތައް ބައްލަވާލެއްވުން.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 pt-1">
                  <span>ޤަވާޢިދު ބައްލަވާ</span>
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
                  <span>އެންމެ ފަހުގެ ނަސީބުވެރިން</span>
                </h3>
                <a href="/portal/ramazan-quiz?tab=winners" className="text-xs text-orange-400 hover:underline font-semibold">
                  ހުރިހާ ނަސީބުވެރިން
                </a>
              </div>

              {stats.recentWinners && stats.recentWinners.length > 0 ? (
                <div className="space-y-2.5">
                  {stats.recentWinners.map((w: any) => (
                    <div key={w.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">ނަންބަރު: {w.participantNumber}</span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-semibold text-[10px]">
                            {w.prizeTitle || 'އިނާމު'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">އައިޑީ: {w.maskedIdNumber}</p>
                      </div>
                      <span className="text-slate-500 font-mono text-[10px]">{formatDateTime(w.selectedAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-6 text-center">އެންމެ ފަހުގެ ނަސީބުވެރިއެއް ނެތް.</p>
              )}
            </div>

            {/* Recent System Audit Logs - Admin Panel Only */}
            {isAdmin && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-sky-400" />
                    <span>އެންމެ ފަހުގެ އޮޑިޓް ލޮގްތައް</span>
                  </h3>
                  <a href="/portal/audit-logs" className="text-xs text-sky-400 hover:underline font-semibold">
                    ހުރިހާ ލޮގްތައް
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
                  <p className="text-xs text-slate-500 py-6 text-center">އޮޑިޓް ލޮގެއް ނެތް.</p>
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
