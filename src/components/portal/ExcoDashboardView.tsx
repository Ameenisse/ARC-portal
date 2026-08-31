import React, { useEffect, useState } from 'react';
import { User, MeetingItem, EventItem, InboxMessage, ClubRulesData } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ClubRulesModal } from './ClubRulesModal';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { PresidentDashboardView } from './PresidentDashboardView';
import { VicePresidentDashboardView } from './VicePresidentDashboardView';
import { SecretaryDashboardView } from './SecretaryDashboardView';
import { TreasurerDashboardView } from './TreasurerDashboardView';
import { PendingApprovalsSection } from './PendingApprovalsSection';
import {
  ShieldCheck,
  Calendar,
  Vote,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  BookOpen,
  Mail,
  AlertCircle,
  HelpCircle,
  FileText,
  UserCheck,
  Sparkles,
  ExternalLink,
  Award,
  ChevronRight,
  RefreshCw,
  FolderLock,
  Wallet,
  Crown
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface ExcoDashboardViewProps {
  user: User;
  onRefreshUser?: () => void;
}

type ExcoViewType = 'general' | 'president' | 'vice_president' | 'secretary' | 'treasurer';

export const ExcoDashboardView: React.FC<ExcoDashboardViewProps> = ({ user, onRefreshUser }) => {
  const { hasPermission } = useAuth();
  const { lang } = usePortalLanguage();
  const isDh = lang === 'dhivehi';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [userPerformance, setUserPerformance] = useState<any>(null);

  // Determine initial view based on user role/designation
  const getInitialView = (): ExcoViewType => {
    const roleLower = (user.roleName || '').toLowerCase();
    const desigLower = (user.designation || '').toLowerCase();
    if (roleLower.includes('president') && !roleLower.includes('vice') || desigLower.includes('president') && !desigLower.includes('vice')) {
      return 'president';
    }
    if (roleLower.includes('vice president') || desigLower.includes('vice president')) {
      return 'vice_president';
    }
    if (roleLower.includes('secretary') || desigLower.includes('secretary')) {
      return 'secretary';
    }
    if (roleLower.includes('treasurer') || desigLower.includes('treasurer')) {
      return 'treasurer';
    }
    return 'general';
  };

  const [activeExcoView, setActiveExcoView] = useState<ExcoViewType>(getInitialView());

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, meetingsRes, eventsRes, messagesRes, perfRes] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getMeetingItems().catch(() => []),
        api.getEventItems().catch(() => []),
        api.getMessages().catch(() => ({ inbox: [] })),
        api.getUserPerformance(user.id).catch(() => null)
      ]);

      setStats(statsRes);
      setMeetings(meetingsRes || []);
      setEvents(eventsRes || []);
      setMessages((messagesRes as any)?.inbox || (messagesRes as any)?.messages || []);
      setUserPerformance(perfRes);
    } catch (err) {
      console.error('Error fetching EXCO dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
    if (onRefreshUser) onRefreshUser();
  };

  // Modules enabled for this EXCO user
  const excoModules = [
    {
      key: 'budget',
      titleDh: 'ބަޖެޓާއި ފައިސާ',
      titleEn: 'Budget & Finance',
      icon: Wallet,
      link: '/portal/budget',
      canView: hasPermission('budget', 'canView') || true,
      canEdit: hasPermission('budget', 'canEdit'),
      canCreate: hasPermission('budget', 'canCreate'),
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400'
    },
    {
      key: 'events',
      titleDh: 'ޙަރަކާތްތަކާއި ބައްދަލުވުންތައް',
      titleEn: 'Events & Meetings',
      icon: Calendar,
      link: '/portal/events-meetings',
      canView: hasPermission('events', 'canView'),
      canEdit: hasPermission('events', 'canEdit'),
      canCreate: hasPermission('events', 'canCreate'),
      color: 'from-amber-500/20 to-orange-500/10 border-orange-500/30 text-orange-400'
    },
    {
      key: 'members',
      titleDh: 'މެންބަރުންގެ ދަފްތަރު',
      titleEn: 'Members Registry',
      icon: Users,
      link: '/portal/members',
      canView: hasPermission('members', 'canView'),
      canEdit: hasPermission('members', 'canEdit'),
      canCreate: hasPermission('members', 'canCreate'),
      color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30 text-sky-400'
    },
    {
      key: 'quiz',
      titleDh: 'ރަމަޟާން ކުއިޒް',
      titleEn: 'Ramadan Quiz Mgmt',
      icon: HelpCircle,
      link: '/portal/ramazan-quiz',
      canView: hasPermission('quiz', 'canView'),
      canEdit: hasPermission('quiz', 'canEdit'),
      canCreate: hasPermission('quiz', 'canCreate'),
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400'
    },
    {
      key: 'messages',
      titleDh: 'މެސެޖް އަދި އިންބޮކްސް',
      titleEn: 'Messages & Inquiries',
      icon: Mail,
      link: '/portal/messages',
      canView: hasPermission('messages', 'canView'),
      canEdit: hasPermission('messages', 'canEdit'),
      canCreate: hasPermission('messages', 'canCreate'),
      color: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/30 text-indigo-400'
    },
    {
      key: 'club_rules',
      titleDh: 'ކްލަބް ޤަވާޢިދު',
      titleEn: 'Club Rules & Bylaws',
      icon: BookOpen,
      link: '/portal/settings',
      canView: true,
      canEdit: hasPermission('club_rules', 'canEdit'),
      canCreate: false,
      color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400'
    },
    {
      key: 'content',
      titleDh: 'ވެބްސައިޓް ކޮންޓެންޓް',
      titleEn: 'Site Content & Slides',
      icon: FileText,
      link: '/portal/slideshow',
      canView: hasPermission('content', 'canView'),
      canEdit: hasPermission('content', 'canEdit'),
      canCreate: hasPermission('content', 'canCreate'),
      color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400'
    }
  ];

  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled' || m.status === 'in_progress');
  const activeVotings: { meeting: MeetingItem; voting: any }[] = [];
  meetings.forEach(m => {
    (m.votings || []).forEach(v => {
      if (v.status === 'open') {
        activeVotings.push({ meeting: m, voting: v });
      }
    });
  });

  return (
    <div className="space-y-8" dir="rtl">
      {/* Officer Panels Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-2.5 px-4 shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>އޮފިސަރުންގެ ޚާއްސަ ޕެނަލްތައް (Executive Office Decks):</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'general', label: 'ޢާންމު ހިންގާ ކޮމިޓީ (EXCO Overview)' },
            { id: 'president', label: 'ރައީސްގެ ޕެނަލް (President)' },
            { id: 'vice_president', label: 'ނައިބު ރައީސް (Vice President)' },
            { id: 'secretary', label: 'ސެކްރެޓަރީ ޖެނެރަލް (Secretary)' },
            { id: 'treasurer', label: 'ޚަޒާންދާރު (Treasurer)' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveExcoView(tab.id as ExcoViewType)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeExcoView === tab.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Render Officer Views */}
      {activeExcoView === 'president' ? (
        <div dir="ltr">
          <PresidentDashboardView user={user} onRefreshUser={onRefreshUser} />
        </div>
      ) : activeExcoView === 'vice_president' ? (
        <div dir="ltr">
          <VicePresidentDashboardView user={user} onRefreshUser={onRefreshUser} />
        </div>
      ) : activeExcoView === 'secretary' ? (
        <div dir="ltr">
          <SecretaryDashboardView user={user} onRefreshUser={onRefreshUser} />
        </div>
      ) : activeExcoView === 'treasurer' ? (
        <div dir="ltr">
          <TreasurerDashboardView user={user} onRefreshUser={onRefreshUser} />
        </div>
      ) : (
        <>
          {/* Top Banner: EXCO Executive Panel */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
            <div className="space-y-3 relative z-10 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ހިންގާ ކޮމިޓީ (EXCO Committee Panel)</span>
                </span>
                {user.designation && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium text-xs">
                    {user.designation}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
                މަރުޙަބާ، {user.fullName || user.username}
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                މިއީ އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ ހިންގާ ކޮމިޓީގެ ޚާއްޞަ ޕެނަލެވެ. ތިރީގައިވާ މޮޑިއުލްތަކުން ޙަރަކާތްތައް ރޭވުމާއި، ބައްދަލުވުންތަކުގެ ވޯޓުލުމާއި، އަދި ކްލަބް އިދާރީ ކަންކަން ކުރިއަށް ގެންދަވާ.
              </p>
            </div>

            <div className="flex items-center gap-3 self-end md:self-center">
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>ކްލަބް ޤަވާޢިދު</span>
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-orange-400 ${refreshing ? 'animate-spin' : ''}`} />
                <span>އާކޮށްލާ</span>
              </button>
            </div>
          </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">ކުރިއަށް އޮތް ބައްދަލުވުން</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{upcomingMeetings.length}</p>
          <p className="text-[10px] text-slate-500">ތާވަލުކުރެވިފައިވާ ބައްދަލުވުން</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">ހުޅުވިފައިވާ ވޯޓުތައް</span>
            <Vote className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{activeVotings.length}</p>
          <p className="text-[10px] text-emerald-400 font-semibold">ބައިވެރިވެވަޑައިގަންނަވާ ވޯޓު</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">އެކްޓިވް ޙަރަކާތްތައް</span>
            <Sparkles className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{events.length}</p>
          <p className="text-[10px] text-slate-500">ރޭވިފައިވާ ޙަރަކާތްތައް</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">އައު މެސެޖް / ސިޓީ</span>
            <Mail className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{messages.filter(m => m.status === 'pending').length}</p>
          <p className="text-[10px] text-slate-500">ބައްލަވާލައްވަންޖެހޭ މެސެޖް</p>
        </div>
      </div>

      {/* Pending Invoices & Bills Executive Approvals Deck */}
      <div dir="ltr">
        <PendingApprovalsSection
          user={user}
          onUpdated={fetchData}
          themeColor="amber"
        />
      </div>

      {/* EXCO Module Access Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-orange-400" />
            <span>ހިންގާ ކޮމިޓީގެ މޮޑިއުލްތަކާއި ހުއްދަތައް (EXCO Module Access)</span>
          </h3>
          <span className="text-xs text-slate-400">ދެވިފައިވާ ހުއްދައިގެ ދަށުން މޮޑިއުލްތަކަށް ވަދެވަޑައިގަންނަވާ</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {excoModules.map(mod => {
            const Icon = mod.icon;
            const hasAccess = mod.canView;
            return (
              <div
                key={mod.key}
                className={`bg-slate-900 border rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4 ${
                  hasAccess
                    ? 'border-slate-800 hover:border-slate-700 hover:bg-slate-850 shadow-md'
                    : 'border-slate-800/50 opacity-60'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-slate-800/80 border border-slate-700/50`}>
                      <Icon className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {hasAccess ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          {mod.canEdit ? 'ފުރިހަމަ ހުއްދަ (Manage)' : 'ބެލުމުގެ ހުއްދަ (View)'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[10px] font-bold">
                          ހުއްދައެއް ނެތް
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white font-heading">{mod.titleDh}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{mod.titleEn}</p>
                  </div>
                </div>

                {hasAccess ? (
                  <a
                    href={mod.link}
                    className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-orange-500 text-slate-200 hover:text-white text-xs font-bold transition group cursor-pointer"
                  >
                    <span>މޮޑިއުލް ހުޅުވާލައްވާ</span>
                    <ArrowRight className="w-4 h-4 transition group-hover:translate-x-1" />
                  </a>
                ) : (
                  <div className="text-[11px] text-slate-500 italic py-1">
                    މި މޮޑިއުލް ބޭނުންކުރުމުގެ ހުއްދަ ދެވިފައެއް ނެތް
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active EXCO Voting & Upcoming Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Voting Topics */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Vote className="w-5 h-5 text-emerald-400" />
              <span>ހިންގާ ކޮމިޓީގެ ވޯޓުތައް (Active EXCO Votings)</span>
            </h4>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
              {activeVotings.length} ހުޅުވިފައި
            </span>
          </div>

          {activeVotings.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs space-y-2">
              <Vote className="w-8 h-8 mx-auto opacity-40 text-slate-600" />
              <p>މިވަގުތު ހުޅުވިފައިވާ އެއްވެސް ވޯޓެއް ނެތެވެ.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeVotings.map(({ meeting, voting }, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{voting.title}</span>
                    <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10">Active</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{voting.description || 'ކޮމިޓީގެ ވޯޓު ނެގުން'}</p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">ބައްދަލުވުން: {meeting.title}</span>
                    <a
                      href="/portal/events-meetings"
                      className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1"
                    >
                      <span>ވޯޓުލައްވާ</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Meetings List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span>ކުރިއަށް އޮތް ބައްދަލުވުންތައް (Upcoming Meetings)</span>
            </h4>
            <a href="/portal/events-meetings" className="text-xs text-orange-400 hover:underline">
              ހުރިހާ ބައްދަލުވުމެއް
            </a>
          </div>

          {upcomingMeetings.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs space-y-2">
              <Calendar className="w-8 h-8 mx-auto opacity-40 text-slate-600" />
              <p>ކުރިއަށް ތާވަލުކުރެވިފައިވާ ބައްދަލުވުމެއް ނެތެވެ.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMeetings.slice(0, 3).map(m => (
                <div key={m.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-white">{m.title}</h5>
                    <p className="text-[11px] text-slate-400 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{m.heldDate} — {m.startTime}</span>
                      <span className="text-slate-600">•</span>
                      <span>{m.venue}</span>
                    </p>
                  </div>
                  <a
                    href="/portal/events-meetings"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold shrink-0 transition"
                  >
                    ބައްލަވާ
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Personal Executive Attendance & Performance Summary */}
      {userPerformance && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-400" />
              <span>ހިންގާ ކޮމިޓީގެ މެންބަރުގެ ޙާޟިރީ އަދި ޕަރފޯމަންސް (Executive Performance)</span>
            </h4>
            <span className="text-xs text-orange-400 font-mono font-bold">
              ސްކޯ: {userPerformance.overallScore || 0} ޕޮއިންޓް
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-bold">ޙާޟިރީ ނިސްބަތް</span>
              <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
                {userPerformance.attendance?.attendanceRate || 0}%
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-bold">ބައިވެރިވި ބައްދަލުވުން</span>
              <p className="text-xl font-bold text-white font-mono mt-1">
                {userPerformance.attendance?.meetingsAttended || 0} / {userPerformance.attendance?.totalMeetings || 0}
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-bold">ބައިވެރިވި ޙަރަކާތް</span>
              <p className="text-xl font-bold text-white font-mono mt-1">
                {userPerformance.attendance?.eventsAttended || 0} / {userPerformance.attendance?.totalEvents || 0}
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-bold">ބެޖުތައް</span>
              <p className="text-xl font-bold text-amber-400 font-mono mt-1">
                {userPerformance.badges?.length || 0} ބެޖް
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <ClubRulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />
      )}
        </>
      )}
    </div>
  );
};
