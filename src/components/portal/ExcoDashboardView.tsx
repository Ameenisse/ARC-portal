import React, { useEffect, useState } from 'react';
import { User, MeetingItem, EventItem, InboxMessage, MeetingVotingItem } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ClubRulesModal } from './ClubRulesModal';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { PresidentDashboardView } from './PresidentDashboardView';
import { VicePresidentDashboardView } from './VicePresidentDashboardView';
import { SecretaryDashboardView } from './SecretaryDashboardView';
import { TreasurerDashboardView } from './TreasurerDashboardView';
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

const translations = {
  dhivehi: {
    deckTitle: 'އޮފިސަރުންގެ ޚާއްސަ ޕެނަލްތައް (Executive Office Decks):',
    generalTab: 'ޢާންމު ހިންގާ ކޮމިޓީ (EXCO Overview)',
    presidentTab: 'ރައީސްގެ ޕެނަލް (President)',
    vpTab: 'ނައިބު ރައީސް (Vice President)',
    secTab: 'ސެކްރެޓަރީ ޖެނެރަލް (Secretary)',
    treasurerTab: 'ޚަޒާންދާރު (Treasurer)',
    welcomeExco: 'ހިންގާ ކޮމިޓީ (EXCO Panel)',
    welcomeGreeting: 'މަރުޙަބާ،',
    bannerDesc: 'މިއީ އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ ހިންގާ ކޮމިޓީގެ ޚާއްޞަ ޕެނަލެވެ. ތިރީގައިވާ މޮޑިއުލްތަކުން ޙަރަކާތްތައް ރޭވުމާއި، ބައްދަލުވުންތަކުގެ ވޯޓުލުމާއި، އަދި ކްލަބް އިދާރީ ކަންކަން ކުރިއަށް ގެންދަވާ.',
    clubRules: 'ކްލަބް ޤަވާޢިދު',
    refresh: 'އާކޮށްލާ',
    upcomingMeeting: 'ކުރިއަށް އޮތް ބައްދަލުވުން',
    upcomingMeetingSub: 'ތާވަލުކުރެވިފައިވާ ބައްދަލުވުން',
    openVotings: 'ހުޅުވިފައިވާ ވޯޓުތައް',
    openVotingsSub: 'ބައިވެރިވެވަޑައިގަންނަވާ ވޯޓު',
    activeEvents: 'އެކްޓިވް ޙަރަކާތްތައް',
    activeEventsSub: 'ރޭވިފައިވާ ޙަރަކާތްތައް',
    newLetters: 'އައު މެސެޖް / ސިޓީ',
    newLettersSub: 'ބައްލަވާލައްވަންޖެހޭ މެސެޖް',
    moduleMatrixTitle: 'ހިންގާ ކޮމިޓީގެ މޮޑިއުލްތަކާއި ހުއްދަތައް (EXCO Module Access)',
    moduleMatrixSub: 'ދެވިފައިވާ ހުއްދައިގެ ދަށުން މޮޑިއުލްތަކަށް ވަދެވަޑައިގަންނަވާ',
    fullManage: 'ފުރިހަމަ ހުއްދަ (Manage)',
    viewOnly: 'ބެލުމުގެ ހުއްދަ (View)',
    noAccess: 'ހުއްދައެއް ނެތް',
    openModule: 'މޮޑިއުލް ހުޅުވާލައްވާ',
    noAccessDesc: 'މި މޮޑިއުލް ބޭނުންކުރުމުގެ ހުއްދަ ދެވިފައެއް ނެތް',
    activeVotingsTitle: 'ހިންގާ ކޮމިޓީގެ ވޯޓުތައް (Active EXCO Votings)',
    noActiveVotings: 'މިވަގުތު ހުޅުވިފައިވާ އެއްވެސް ވޯޓެއް ނެތެވެ.',
    castVote: 'ވޯޓުލައްވާ',
    upcomingMeetingsTitle: 'ކުރިއަށް އޮތް ބައްދަލުވުންތައް (Upcoming Meetings)',
    noUpcomingMeetings: 'ކުރިއަށް އޮތް އެއްވެސް ބައްދަލުވުމެއް ތާވަލުކުރެވިފައެއް ނެތެވެ.',
    viewAgenda: 'އެޖެންޑާ ބައްލަވާ',
    meetingStatusScheduled: 'ތާވަލުކުރެވިފައި',
    meetingStatusInProgress: 'ކުރިއަށްދަނީ'
  },
  english: {
    deckTitle: 'Executive Office Decks:',
    generalTab: 'EXCO Overview',
    presidentTab: "President's Deck",
    vpTab: "Vice President's Deck",
    secTab: "Secretary General's Deck",
    treasurerTab: "Treasurer's Deck",
    welcomeExco: 'EXCO Committee Panel',
    welcomeGreeting: 'Welcome,',
    bannerDesc: 'Official Executive Committee workspace of Ananda Recreation Club. Coordinate events, review meeting resolutions, cast committee votes, and oversee governance modules.',
    clubRules: 'Club Bylaws',
    refresh: 'Refresh',
    upcomingMeeting: 'Upcoming Meetings',
    upcomingMeetingSub: 'Scheduled Meetings',
    openVotings: 'Open Votings',
    openVotingsSub: 'Pending Committee Votes',
    activeEvents: 'Active Events',
    activeEventsSub: 'Planned Activities',
    newLetters: 'Inquiries & Letters',
    newLettersSub: 'Action Items in Inbox',
    moduleMatrixTitle: 'EXCO Module Access & Permissions',
    moduleMatrixSub: 'Direct gateway to modules authorized for your executive role',
    fullManage: 'Full Access (Manage)',
    viewOnly: 'Read-Only (View)',
    noAccess: 'No Access',
    openModule: 'Launch Module',
    noAccessDesc: 'You do not have permission to access this module',
    activeVotingsTitle: 'Active EXCO Votings & Resolutions',
    noActiveVotings: 'No open resolution votings at this moment.',
    castVote: 'Cast Vote',
    upcomingMeetingsTitle: 'Upcoming Committee Meetings',
    noUpcomingMeetings: 'No upcoming meetings currently scheduled.',
    viewAgenda: 'View Agenda',
    meetingStatusScheduled: 'Scheduled',
    meetingStatusInProgress: 'In Progress'
  }
};

export const ExcoDashboardView: React.FC<ExcoDashboardViewProps> = ({ user, onRefreshUser }) => {
  const { hasPermission } = useAuth();
  const { lang, dir } = usePortalLanguage();
  const t = translations[lang] || translations.dhivehi;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [showRulesModal, setShowRulesModal] = useState(false);

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
      const [statsRes, meetingsRes, eventsRes, messagesRes] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getMeetingItems().catch(() => []),
        api.getEventItems().catch(() => []),
        api.getMessages().catch(() => ({ inbox: [] }))
      ]);

      setStats(statsRes);
      setMeetings(meetingsRes || []);
      setEvents(eventsRes || []);
      setMessages((messagesRes as any)?.inbox || (messagesRes as any)?.messages || []);
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
      descDh: 'އާމްދަނީ، ޚަރަދުތައް، މަހު ފީގެ ފަންޑު އަދި މާލީ ބަޔާންތައް.',
      descEn: 'Income, expenditure, membership subscription pool, and cash accounts.',
      icon: Wallet,
      link: '/portal/budget',
      canView: hasPermission('budget', 'canView') || true,
      canEdit: hasPermission('budget', 'canEdit')
    },
    {
      key: 'events',
      titleDh: 'ޙަރަކާތްތަކާއި ބައްދަލުވުންތައް',
      titleEn: 'Events & Meetings',
      descDh: 'ކްލަބް ޙަރަކާތްތައް، ބައްދަލުވުންތައް، ޙާޟިރީ އަދި ވޯޓު ނެގުން.',
      descEn: 'Meeting schedules, agenda items, attendance logs, and resolutions.',
      icon: Calendar,
      link: '/portal/events-meetings',
      canView: hasPermission('events', 'canView') || hasPermission('events_meetings', 'canView') || true,
      canEdit: hasPermission('events', 'canEdit') || hasPermission('events_meetings', 'canEdit')
    },
    {
      key: 'members',
      titleDh: 'މެންބަރުންގެ ދަފްތަރު',
      titleEn: 'Members Registry',
      descDh: 'ކްލަބުގެ މެންބަރުން، ހިންގާ ކޮމިޓީ އަދި މެންބަރޝިޕް ކެޓަގަރީތައް.',
      descEn: 'Member profiles, executive committee directory, and categories.',
      icon: Users,
      link: '/portal/members',
      canView: hasPermission('members', 'canView') || true,
      canEdit: hasPermission('members', 'canEdit')
    },
    {
      key: 'quiz',
      titleDh: 'ރަމަޟާން ކުއިޒް',
      titleEn: 'Ramadan Quiz Mgmt',
      descDh: 'ސުވާލުތައް، ބައިވެރިންގެ ޖަވާބުތައް، ނަސީބުވެރިން އަދި ގުރުއަތުލުން.',
      descEn: 'Question bank, participant answer verification, and lucky draws.',
      icon: HelpCircle,
      link: '/portal/ramazan-quiz',
      canView: hasPermission('quiz', 'canView') || hasPermission('ramazan_quiz', 'canView') || true,
      canEdit: hasPermission('quiz', 'canEdit') || hasPermission('ramazan_quiz', 'canEdit')
    },
    {
      key: 'messages',
      titleDh: 'މެސެޖް އަދި އިންބޮކްސް',
      titleEn: 'Messages & Inquiries',
      descDh: 'މެސެޖުތައް ބެއްލެވުން، އެކްޝަން ރެކޯޑު އެޅުން އަދި ފިޔަވަޅުތައް.',
      descEn: 'Incoming letters, public inquiries, and official committee responses.',
      icon: Mail,
      link: '/portal/messages',
      canView: hasPermission('messages', 'canView') || true,
      canEdit: hasPermission('messages', 'canEdit')
    },
    {
      key: 'club_rules',
      titleDh: 'ކްލަބް ޤަވާޢިދު',
      titleEn: 'Club Rules & Bylaws',
      descDh: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ ހިންގާ ޤަވާޢިދާއި އުޞޫލުތައް.',
      descEn: 'Official club constitution, governance articles, and bylaws.',
      icon: BookOpen,
      link: '/portal/club-rules',
      canView: true,
      canEdit: hasPermission('club_rules', 'canEdit')
    }
  ];

  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled' || m.status === 'in_progress');
  const activeVotings: { meeting: MeetingItem; voting: MeetingVotingItem }[] = [];
  meetings.forEach(m => {
    (m.votings || []).forEach(v => {
      if (v.status === 'open') {
        activeVotings.push({ meeting: m, voting: v });
      }
    });
  });

  return (
    <div className="space-y-8" dir={dir}>
      
      {/* Officer Panels Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-2.5 px-4 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>{t.deckTitle}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'general', label: t.generalTab },
            { id: 'president', label: t.presidentTab },
            { id: 'vice_president', label: t.vpTab },
            { id: 'secretary', label: t.secTab },
            { id: 'treasurer', label: t.treasurerTab }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveExcoView(tab.id as ExcoViewType)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeExcoView === tab.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
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
        <PresidentDashboardView user={user} onRefreshUser={onRefreshUser} />
      ) : activeExcoView === 'vice_president' ? (
        <VicePresidentDashboardView user={user} onRefreshUser={onRefreshUser} />
      ) : activeExcoView === 'secretary' ? (
        <SecretaryDashboardView user={user} onRefreshUser={onRefreshUser} />
      ) : activeExcoView === 'treasurer' ? (
        <TreasurerDashboardView user={user} onRefreshUser={onRefreshUser} />
      ) : (
        <>
          {/* Top Banner: EXCO Executive Panel */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-3 relative z-10 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.welcomeExco}</span>
                </span>
                {user.designation && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs">
                    {user.designation}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
                {t.welcomeGreeting} {user.fullName || user.username}
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t.bannerDesc}
              </p>
            </div>

            <div className="flex items-center gap-3 self-end md:self-center shrink-0">
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>{t.clubRules}</span>
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-orange-400 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{t.refresh}</span>
              </button>
            </div>
          </div>

          {/* Metric Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-md">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-semibold uppercase">{t.upcomingMeeting}</span>
                <Calendar className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">{upcomingMeetings.length}</p>
              <p className="text-[10px] text-slate-500">{t.upcomingMeetingSub}</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-md">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-semibold uppercase">{t.openVotings}</span>
                <Vote className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">{activeVotings.length}</p>
              <p className="text-[10px] text-emerald-400 font-semibold">{t.openVotingsSub}</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-md">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-semibold uppercase">{t.activeEvents}</span>
                <Sparkles className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">{events.length}</p>
              <p className="text-[10px] text-slate-500">{t.activeEventsSub}</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-md">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-semibold uppercase">{t.newLetters}</span>
                <Mail className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">
                {messages.filter(m => m.status === 'pending' || m.status === 'in_progress').length}
              </p>
              <p className="text-[10px] text-slate-500">{t.newLettersSub}</p>
            </div>
          </div>

          {/* EXCO Module Access Matrix */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                <FolderLock className="w-5 h-5 text-orange-400" />
                <span>{t.moduleMatrixTitle}</span>
              </h3>
              <span className="text-xs text-slate-400">{t.moduleMatrixSub}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {excoModules.map(mod => {
                const Icon = mod.icon;
                const hasAccess = mod.canView;
                const title = lang === 'english' ? mod.titleEn : mod.titleDh;
                const desc = lang === 'english' ? mod.descEn : mod.descDh;

                return (
                  <div
                    key={mod.key}
                    className={`bg-slate-900 border rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4 shadow-md ${
                      hasAccess
                        ? 'border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                        : 'border-slate-800/50 opacity-60'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50">
                          <Icon className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                          {hasAccess ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                              {mod.canEdit ? t.fullManage : t.viewOnly}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[10px] font-bold">
                              {t.noAccess}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-white font-heading">{title}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{desc}</p>
                      </div>
                    </div>

                    {hasAccess ? (
                      <a
                        href={mod.link}
                        className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-orange-500 text-slate-200 hover:text-white text-xs font-bold transition-all group cursor-pointer"
                      >
                        <span>{t.openModule}</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </a>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic py-1">
                        {t.noAccessDesc}
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
                  <span>{t.activeVotingsTitle}</span>
                </h4>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
                  {activeVotings.length} {lang === 'english' ? 'Open' : 'ހުޅުވިފައި'}
                </span>
              </div>

              {activeVotings.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs space-y-2">
                  <Vote className="w-8 h-8 mx-auto opacity-40 text-slate-600" />
                  <p>{t.noActiveVotings}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeVotings.map(({ meeting, voting }, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{voting.topic}</span>
                        <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10">Active</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {voting.description || (lang === 'english' ? 'Executive Committee Resolution Vote' : 'ކޮމިޓީގެ ވޯޓު ނެގުން')}
                      </p>
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          {lang === 'english' ? `Meeting: ${meeting.title}` : `ބައްދަލުވުން: ${meeting.title}`}
                        </span>
                        <a
                          href="/portal/events-meetings"
                          className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1"
                        >
                          <span>{t.castVote}</span>
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
                  <span>{t.upcomingMeetingsTitle}</span>
                </h4>
                <a
                  href="/portal/events-meetings"
                  className="text-xs text-orange-400 hover:underline font-bold"
                >
                  {lang === 'english' ? 'All Meetings' : 'ހުރިހާ ބައްދަލުވުން'}
                </a>
              </div>

              {upcomingMeetings.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs space-y-2">
                  <Calendar className="w-8 h-8 mx-auto opacity-40 text-slate-600" />
                  <p>{t.noUpcomingMeetings}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMeetings.slice(0, 3).map((meeting) => (
                    <div key={meeting.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-white">{meeting.title}</h5>
                        <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10">
                          {meeting.status === 'in_progress' ? t.meetingStatusInProgress : t.meetingStatusScheduled}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{meeting.heldDate} {meeting.startTime || ''}</span>
                        </span>
                        {meeting.venue && (
                          <span className="truncate">{lang === 'english' ? `Venue: ${meeting.venue}` : `ތަން: ${meeting.venue}`}</span>
                        )}
                      </div>
                      <div className="pt-1 flex items-center justify-end">
                        <a
                          href="/portal/events-meetings"
                          className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1"
                        >
                          <span>{t.viewAgenda}</span>
                          <ChevronRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}

      <ClubRulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />
    </div>
  );
};

export default ExcoDashboardView;
