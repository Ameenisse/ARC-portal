import React, { useEffect, useState } from 'react';
import { User, UserPerformanceData, ClubMember } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import { ClubRulesModal } from './ClubRulesModal';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import {
  UserCheck,
  Award,
  Trophy,
  HelpCircle,
  Calendar,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Link,
  Unlink,
  Search,
  ShieldCheck,
  Phone,
  MapPin,
  TrendingUp,
  Activity,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface MemberDashboardViewProps {
  user: User;
  onRefreshUser?: () => void;
}

const translations = {
  dhivehi: {
    panelTitle: 'މެންބަރުންގެ ޕޯޓަލް',
    panelSub: 'Members Panel',
    notConnected: 'ގުޅުވާލެވިފައެއް ނެތް',
    welcome: 'މަރުޙަބާ،',
    bannerDesc: 'މިއީ އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ މެންބަރުންގެ ޚާއްޞަ ޑޭޝްބޯޑެވެ. މިތަނުން ތިބާގެ މެންބަރޝިޕް މައުލޫމާތާއި، ރަމަޟާން ކުއިޒް ބައިވެރިވުމާއި، ޙާޟިރީ އަދި ނަސީބުވެރިންގެ ރެކޯޑުތައް ބައްލަވާލެވޭނެއެވެ.',
    viewRules: 'ކްލަބް ޤަވާޢިދު ބައްލަވާ',
    answerQuiz: 'މިއަދުގެ ކުއިޒަށް ޖަވާބުދެއްވާ',
    activeMember: 'އެކްޓިވް މެންބަރު',
    inactiveMember: 'އިންއެކްޓިވް',
    joinedDate: 'ގުޅުނު ތާރީޚު:',
    disconnectMember: 'މެންބަރު ވަކިކޮށްލާ',
    disconnectConfirm: 'މެންބަރު އެކައުންޓް ވަކިކޮށްލަން ބޭނުންފުޅުތޯ؟ (Are you sure you want to disconnect this member profile?)',
    connectHeader: 'މެންބަރޝިޕް ގުޅުވާލުން (Connect Member Profile)',
    connectSub: 'ކްލަބުގެ ދަފްތަރުގައިވާ ތިބާގެ މެންބަރު ރެކޯޑާ މި އެކައުންޓް ގުޅުވާލައްވާ. މެންބަރު ނަންބަރު (e.g. ARC-0012) ނުވަތަ ފޯނު ނަންބަރު ބޭނުންކުރައްވާ.',
    connectBtn: 'މެންބަރު ގުޅުވާލާ',
    placeholderInput: 'މެންބަރު ނަންބަރު (ARC-0001) ނުވަތަ ފޯނު ނަންބަރު ޖައްސަވާ...',
    connectSubmit: 'ގުޅުވާލާ',
    cancel: 'ކެންސަލް',
    loadingPerf: 'ޕަރފޯމަންސް ރެކޯޑުތައް ލޯޑުވަނީ...',
    overallScore: 'ޖުމްލަ ސްކޯ',
    quizSubmissions: 'ކުއިޒް ޖަވާބު',
    correctAccuracy: 'ރަނގަޅު',
    correctAnswers: 'ރަނގަޅު ޖަވާބު',
    luckyWins: 'ނަސީބުވެރި އިނާމު',
    prizesSuffix: 'އިނާމު',
    collected: 'ހަވާލުކުރެވިފައި',
    attendance: 'ޙާޟިރީ',
    attendedActivities: 'ޙަރަކާތަށް ބައިވެރިވި',
    badgesEarned: 'ލިބިފައިވާ ބެޖުތައް:',
    overviewTab: 'ޚުލާޞާ (Overview)',
    quizTab: 'ކުއިޒް ޖަވާބުތައް',
    winsTab: 'ނަސީބުވެރިންގެ އިނާމު',
    attendanceTab: 'ޙާޟިރީ',
    quizHistoryTitle: 'ރަމަޟާން ކުއިޒް ޖަވާބުތަކުގެ ތާރީޚު',
    qNum: 'ސުވާލު #',
    qTitle: 'ސުވާލުގެ ސުރުޚީ',
    selectedAns: 'ޚިޔާރުކުރި ޖަވާބު',
    result: 'ނަތީޖާ',
    date: 'ތާރީޚު',
    answered: 'ޖަވާބު ދެވިފައި',
    correct: 'ރަނގަޅު',
    incorrect: 'ނުބައި',
    noQuizSubmissions: 'އެއްވެސް ސުވާލަކަށް އަދި ޖަވާބު ދެއްވާފައެއް ނެތެވެ.',
    winsHistoryTitle: 'ނަސީބުވެރިންގެ ރެކޯޑުތައް',
    qPrefix: 'ސުވާލު #',
    sponsor: 'ސްޕޮންސަރ:',
    prizeStatus: 'އިނާމުގެ ޙާލަތު:',
    handedOver: 'ހަވާލުކުރެވިއްޖެ',
    pending: 'އިންތިޒާރުގައި',
    noWins: 'އަދި ނަސީބުވެރިއެއްގެ ގޮތުގައި ހޮވިފައެއް ނެތެވެ.',
    attendanceTitle: 'ޙަރަކާތްތަކާއި ބައްދަލުވުންތަކުގެ ޙާޟިރީ',
    event: 'ޙަރަކާތް',
    meeting: 'ބައްދަލުވުން',
    venue: 'ތަން:',
    present: 'ޙާޟިރުވި',
    excused: 'ޢުޛުރުވެރި',
    absent: 'ސަލާމުގައި',
    noAttendance: 'ޙާޟިރީ ރެކޯޑެއް އަދި ފެންނާކަށް ނެތެވެ.'
  },
  english: {
    panelTitle: 'Members Panel',
    panelSub: 'ARC Portal',
    notConnected: 'Not Connected',
    welcome: 'Welcome,',
    bannerDesc: 'This is the official Members Panel of Ananda Recreation Club. Access your membership details, Ramadan quiz submissions, attendance history, and lucky draw win records here.',
    viewRules: 'View Club Rules',
    answerQuiz: "Answer Today's Quiz",
    activeMember: 'Active Member',
    inactiveMember: 'Inactive Member',
    joinedDate: 'Joined Date:',
    disconnectMember: 'Disconnect Member',
    disconnectConfirm: 'Are you sure you want to disconnect this member profile?',
    connectHeader: 'Connect Existing Member Profile',
    connectSub: 'Link this user account with your official club membership record using your Member Number (e.g. ARC-0012) or registered Phone Number.',
    connectBtn: 'Connect Member Profile',
    placeholderInput: 'Enter Member Number (ARC-0001) or Phone Number...',
    connectSubmit: 'Connect',
    cancel: 'Cancel',
    loadingPerf: 'Loading performance records...',
    overallScore: 'Overall Score',
    quizSubmissions: 'Quiz Answers',
    correctAccuracy: 'Correct',
    correctAnswers: 'Correct Answers',
    luckyWins: 'Lucky Draw Wins',
    prizesSuffix: 'Wins',
    collected: 'Collected',
    attendance: 'Attendance',
    attendedActivities: 'Attended Activities',
    badgesEarned: 'Badges Earned:',
    overviewTab: 'Overview',
    quizTab: 'Quiz Submissions',
    winsTab: 'Lucky Draw Wins',
    attendanceTab: 'Attendance',
    quizHistoryTitle: 'Ramadan Quiz Submission History',
    qNum: 'Question #',
    qTitle: 'Question Title',
    selectedAns: 'Selected Answer',
    result: 'Result',
    date: 'Date',
    answered: 'Submitted',
    correct: 'Correct',
    incorrect: 'Incorrect',
    noQuizSubmissions: 'No quiz answers submitted yet.',
    winsHistoryTitle: 'Lucky Draw Winner Records',
    qPrefix: 'Question #',
    sponsor: 'Sponsor:',
    prizeStatus: 'Prize Status:',
    handedOver: 'Handed Over',
    pending: 'Pending',
    noWins: 'No lucky draw wins yet.',
    attendanceTitle: 'Events & Meetings Attendance History',
    event: 'Event',
    meeting: 'Meeting',
    venue: 'Venue:',
    present: 'Present',
    excused: 'Excused',
    absent: 'Absent',
    noAttendance: 'No attendance records found yet.'
  }
};

export const MemberDashboardView: React.FC<MemberDashboardViewProps> = ({ user, onRefreshUser }) => {
  const { showToast } = useToast();
  const { lang, setLang, dir } = usePortalLanguage();
  const [data, setData] = useState<UserPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'quiz' | 'attendance' | 'wins'>('overview');
  const [showRulesModal, setShowRulesModal] = useState(false);

  const txt = translations[lang];

  // Connect member modal/inline form state
  const [searchQuery, setSearchQuery] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const res = await api.getUserPerformance('me');
      setData(res);
    } catch (err: any) {
      console.warn('Failed to load user performance', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [user.id, user.memberId]);

  const handleConnectMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      showToast('error', lang === 'english' ? 'Please enter Member Number or Phone Number.' : 'މެންބަރު ނަންބަރު ނުވަތަ ފޯނު ނަންބަރު ޖައްސަވާ.');
      return;
    }

    try {
      setConnectLoading(true);
      const res = await api.connectMember({ query: searchQuery.trim() });
      showToast('success', res.message || (lang === 'english' ? 'Member account connected successfully!' : 'މެންބަރު އެކައުންޓް ކާމިޔާބުކަމާއެކު ގުޅުވާލެވިއްޖެ!'));
      setSearchQuery('');
      setShowConnectForm(false);
      if (onRefreshUser) onRefreshUser();
      fetchPerformance();
    } catch (err: any) {
      showToast('error', err.message || (lang === 'english' ? 'Failed to connect member account.' : 'މެންބަރު އެކައުންޓް ގުޅުވާލުމުގައި މައްސަލައެއް ދިމާވެއްޖެ.'));
    } finally {
      setConnectLoading(false);
    }
  };

  const handleDisconnectMember = async () => {
    if (!window.confirm(txt.disconnectConfirm)) return;
    try {
      await api.disconnectMember();
      showToast('success', lang === 'english' ? 'Member account unlinked.' : 'މެންބަރު އެކައުންޓް ވަކިކޮށްލެވިއްޖެ.');
      if (onRefreshUser) onRefreshUser();
      fetchPerformance();
    } catch (err: any) {
      showToast('error', err.message || (lang === 'english' ? 'Failed to disconnect member.' : 'މެންބަރު ވަކިކުރުމުގައި މައްސަލައެއް ދިމާވެއްޖެ.'));
    }
  };

  const linkedMember: ClubMember | undefined = data?.member;

  return (
    <div className="space-y-8" dir={dir}>
      
      {/* Top Banner: Welcome to Members Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                <UserCheck className="w-3.5 h-3.5" />
                <span>{txt.panelTitle}</span>
              </span>
              {linkedMember ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 font-bold font-mono text-xs">
                  {linkedMember.memberNumber}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-xs">
                  {txt.notConnected}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
              {txt.welcome} {user.fullName}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              {txt.bannerDesc}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Language Toggle Button (ENG / DHI) */}
            <div className="flex items-center bg-slate-950/90 border border-slate-700/80 rounded-2xl p-1 gap-1 shadow-inner shrink-0" dir="ltr">
              <button
                type="button"
                onClick={() => setLang('dhivehi')}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                  lang === 'dhivehi'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ދިވެހި (DHI)
              </button>
              <button
                type="button"
                onClick={() => setLang('english')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  lang === 'english'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ENG
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-orange-400" />
              <span>{txt.viewRules}</span>
            </button>
            <a
              href="/#quiz"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{txt.answerQuiz}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>
      </div>

      {/* Member Profile Connection Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        {linkedMember ? (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border-2 border-orange-500/40 text-orange-400 flex items-center justify-center text-[18px] text-center font-black shrink-0 shadow-inner font-mono" style={{ fontSize: '18px', textAlign: 'center' }}>
                {linkedMember.memberNumber}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-white font-heading">{linkedMember.fullName}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[10px]">
                    {linkedMember.status === 'active' ? txt.activeMember : txt.inactiveMember}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium text-[10px] uppercase">
                    {linkedMember.memberType}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                  {linkedMember.phoneNumber && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-orange-400" />
                      <span className="font-mono">{linkedMember.phoneNumber}</span>
                    </span>
                  )}
                  {linkedMember.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      <span>{linkedMember.address}</span>
                    </span>
                  )}
                  {linkedMember.joinedDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>{txt.joinedDate} {linkedMember.joinedDate}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(user.roleName === 'Admin' || user.roleId === 'role_admin' || user.roleName?.toLowerCase().includes('admin')) && (
              <button
                type="button"
                onClick={handleDisconnectMember}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all self-end md:self-center cursor-pointer"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>{txt.disconnectMember}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 text-center" style={{ fontSize: '18px', textAlign: 'center' }}>
                <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                  <Link className="w-4 h-4 text-orange-400" />
                  <span>{txt.connectHeader}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {txt.connectSub}
                </p>
              </div>

              {!showConnectForm && (
                <button
                  type="button"
                  onClick={() => setShowConnectForm(true)}
                  className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 shrink-0 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>{txt.connectBtn}</span>
                </button>
              )}
            </div>

            {showConnectForm && (
              <form onSubmit={handleConnectMember} className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={txt.placeholderInput}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-sans"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={connectLoading}
                    className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 flex-1 sm:flex-initial cursor-pointer"
                  >
                    {connectLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>{txt.connectSubmit}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConnectForm(false)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
                  >
                    {txt.cancel}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* User Performance Key Metrics Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">{txt.loadingPerf}</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          
          {/* Main Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            {/* Overall Score */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">{txt.overallScore}</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white">{data.overallScore}</span>
                <span className="text-xs font-bold text-emerald-400">/ 100</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500" 
                  style={{ width: `${data.overallScore}%` }}
                />
              </div>
            </div>

            {/* Quiz Attempts & Accuracy */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">{txt.quizSubmissions}</span>
                <HelpCircle className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white">{data.quiz.totalAttempts}</span>
                <span className="text-xs font-bold text-orange-400">({data.quiz.accuracyRate}% {txt.correctAccuracy})</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {data.quiz.correctAnswers} {txt.correctAnswers}
              </p>
            </div>

            {/* Lucky Draw Wins */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">{txt.luckyWins}</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white">{data.quiz.wins.length}</span>
                <span className="text-xs font-bold text-amber-400">{txt.prizesSuffix}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {data.quiz.wins.filter(w => w.prizeCollectionStatus === 'collected').length} {txt.collected}
              </p>
            </div>

            {/* Attendance Rate */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">{txt.attendance}</span>
                <Award className="w-4 h-4 text-sky-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white">{data.attendance.attendanceRate}%</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {lang === 'english' ? `Attended ${data.attendance.totalPresent} Activities` : `${data.attendance.totalPresent} ޙަރަކާތަށް ބައިވެރިވި`}
              </p>
            </div>

          </div>

          {/* Badges Earned Banner */}
          {data.badges && data.badges.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-3">
              <span className={`text-xs font-bold text-slate-400 flex items-center gap-1.5 ${lang === 'english' ? 'pr-2 border-r' : 'pl-2 border-l'} border-slate-800`}>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{txt.badgesEarned}</span>
              </span>
              {data.badges.map(b => (
                <div key={b.id} className="px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-bold flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-orange-400" />
                  <span>{b.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tabbed Performance Records */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            
            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                {txt.overviewTab}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('quiz')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'quiz'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <span>{txt.quizTab}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-[10px]">
                  {data.quiz.submissions.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('wins')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'wins'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <span>{txt.winsTab}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-[10px]">
                  {data.quiz.wins.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'attendance'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <span>{txt.attendanceTab}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-[10px]">
                  {data.attendance.records.length}
                </span>
              </button>
            </div>

            {/* TAB CONTENT: Quiz Submissions */}
            {(activeTab === 'overview' || activeTab === 'quiz') && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold font-heading text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-orange-400" />
                  <span>{txt.quizHistoryTitle}</span>
                </h4>

                {data.quiz.submissions && data.quiz.submissions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className={`w-full text-xs ${lang === 'english' ? 'text-left' : 'text-right'}`}>
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                          <th className={`py-3 px-3 ${lang === 'english' ? 'text-left' : 'text-right'}`}>{txt.qNum}</th>
                          <th className={`py-3 px-3 ${lang === 'english' ? 'text-left' : 'text-right'}`}>{txt.selectedAns}</th>
                          <th className="py-3 px-3 text-center">{txt.result}</th>
                          <th className={`py-3 px-3 ${lang === 'english' ? 'text-right' : 'text-left'}`}>{txt.date}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {data.quiz.submissions.map(sub => (
                          <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-3 font-bold font-mono text-orange-400">
                              #{sub.questionNumber}
                            </td>
                            <td className="py-3 px-3 text-slate-300 font-semibold">
                              {sub.selectedOptionText || txt.answered}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {sub.isCorrect ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{txt.correct}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold text-[10px]">
                                  <XCircle className="w-3 h-3" />
                                  <span>{txt.incorrect}</span>
                                </span>
                              )}
                            </td>
                            <td className={`py-3 px-3 ${lang === 'english' ? 'text-right' : 'text-left'} font-mono text-slate-500 text-[10px]`}>
                              {formatDateTime(sub.submittedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center bg-slate-950/50 rounded-2xl">
                    {txt.noQuizSubmissions}
                  </p>
                )}
              </div>
            )}

            {/* TAB CONTENT: Lucky Draw Wins */}
            {(activeTab === 'overview' || activeTab === 'wins') && (
              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                <h4 className="text-sm font-bold font-heading text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>{txt.winsHistoryTitle}</span>
                </h4>

                {data.quiz.wins && data.quiz.wins.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.quiz.wins.map(win => (
                      <div key={win.id} className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs">
                            {txt.qPrefix}{win.questionNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDateTime(win.selectedAt)}
                          </span>
                        </div>
                        <h5 className="text-base font-bold text-white font-heading">{win.prizeTitle}</h5>
                        {win.sponsorName && (
                          <p className="text-xs text-slate-400">{txt.sponsor} <strong className="text-slate-200">{win.sponsorName}</strong></p>
                        )}
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-slate-400">{txt.prizeStatus}</span>
                          <span className={`font-bold px-2 py-0.5 rounded-md ${
                            win.prizeCollectionStatus === 'collected' 
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {win.prizeCollectionStatus === 'collected' ? txt.handedOver : txt.pending}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center bg-slate-950/50 rounded-2xl">
                    {txt.noWins}
                  </p>
                )}
              </div>
            )}

            {/* TAB CONTENT: Attendance History */}
            {(activeTab === 'overview' || activeTab === 'attendance') && (
              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                <h4 className="text-sm font-bold font-heading text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span>{txt.attendanceTitle}</span>
                </h4>

                {data.attendance.records && data.attendance.records.length > 0 ? (
                  <div className="space-y-2">
                    {data.attendance.records.map((rec, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{rec.title}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] uppercase">
                              {rec.type === 'event' ? txt.event : txt.meeting}
                            </span>
                          </div>
                          {rec.venue && <p className="text-[11px] text-slate-400">{txt.venue} {rec.venue}</p>}
                        </div>
                        <div className="shrink-0">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            rec.status === 'present' 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : rec.status === 'excused' 
                              ? 'bg-amber-500/20 text-amber-300' 
                              : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {rec.status === 'present' ? txt.present : rec.status === 'excused' ? txt.excused : txt.absent}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center bg-slate-950/50 rounded-2xl">
                    {txt.noAttendance}
                  </p>
                )}
              </div>
            )}

          </div>

        </div>
      ) : null}

      <ClubRulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />
    </div>
  );
};
