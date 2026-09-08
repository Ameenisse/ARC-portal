import React, { useEffect, useState } from 'react';
import {
  User,
  UserPerformanceData,
  ClubMember,
  MemberDashboardWidgetSettings,
  ContributionPaymentRequest,
  MemberContributionSetting,
  MemberContributionRecord
} from '../../types';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import { ClubRulesModal } from './ClubRulesModal';
import { MemberBudgetReportView } from './MemberBudgetReportView';
import { PayContributionModal } from './budget/PayContributionModal';
import { MemberPerformanceStatusCard } from './MemberPerformanceStatusCard';
import { UserPerformanceModal } from './UserPerformanceModal';
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
  BookOpen,
  Wallet,
  FileText,
  DollarSign,
  AlertCircle,
  CreditCard,
  Upload,
  Copy,
  Check,
  Building2,
  Calculator,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface MemberDashboardViewProps {
  user: User;
  onRefreshUser?: () => void;
}

const DEFAULT_WIDGET_SETTINGS: MemberDashboardWidgetSettings = {
  showWelcomeBanner: true,
  showProfileCard: true,
  showStatsSummary: true,
  showBadges: true,
  showQuizHistory: true,
  showWinsHistory: true,
  showAttendanceHistory: true,
  showClubRulesQuickButton: true,
  showQuizQuickButton: true,
  showFeePayQuickButton: true,
  allowMemberConnectProfile: true,
  showBudgetStats: true,
  showPersonalBudgetReport: true
};

const MONTH_NAMES = [
  { num: 1, en: 'January', dv: 'ޖެނުއަރީ' },
  { num: 2, en: 'February', dv: 'ފެބްރުއަރީ' },
  { num: 3, en: 'March', dv: 'މާރިޗު' },
  { num: 4, en: 'April', dv: 'އޭޕްރީލް' },
  { num: 5, en: 'May', dv: 'މެއި' },
  { num: 6, en: 'June', dv: 'ޖޫން' },
  { num: 7, en: 'July', dv: 'ޖުލައި' },
  { num: 8, en: 'August', dv: 'އޯގަސްޓް' },
  { num: 9, en: 'September', dv: 'ސެޕްޓެމްބަރ' },
  { num: 10, en: 'October', dv: 'އޮކްޓޯބަރ' },
  { num: 11, en: 'November', dv: 'ނޮވެމްބަރ' },
  { num: 12, en: 'December', dv: 'ޑިސެމްބަރ' }
];

const translations = {
  dhivehi: {
    panelTitle: 'މެންބަރުންގެ ޕޯޓަލް',
    panelSub: 'Members Panel',
    notConnected: 'ގުޅުވާލެވިފައެއް ނެތް',
    welcome: 'މަރުޙަބާ،',
    bannerDesc: 'މިއީ އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ މެންބަރުންގެ ޚާއްޞަ ޑޭޝްބޯޑެވެ. މިތަނުން ތިބާގެ މެންބަރޝިޕް މައުލޫމާތާއި، ރަމަޟާން ކުއިޒް ބައިވެރިވުމާއި، ޙާޟިރީ، ނަސީބުވެރިންގެ ރެކޯޑުތައް އަދި މެންބަރޝިޕް ފީގެ ހިސާބުތައް ބައްލަވާލެވޭނެއެވެ.',
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
    budgetTab: 'ބަޖެޓާއި ފީގެ ހިސާބު',
    duesSummaryTitle: 'މެންބަރޝިޕް ފީގެ ޚުލާޞާ',
    totalPaidDues: 'ދެއްކި ފީ:',
    pendingDues: 'ދައްކަންޖެހޭ ބާކީ:',
    totalFines: 'ޖޫރިމަނާ:',
    viewBudgetDetails: 'ފީގެ ތަފްޞީލް ބައްލަވާ',
    quizHistoryTitle: 'ރަމަޟާން ކުއިޒް ޖަވާބުތަކުގެ ތާރީޚު',
    qNum: 'ސުވާލު #',
    qTitle: 'ސުވާލުގެ ސުރުޚީ',
    selectedAns: 'ޚިޔާރުކުރި ޖަވާބު',
    result: 'ނަތީޖާ',
    date: 'ތާރީޚު',
    answered: 'ޖަވާބު ދެވިފައި',
    correct: 'ރަނގަޅު',
    incorrect: 'ނުބައި',
    pendingReveal: 'ޖަވާބު ހާމަކުރުމުގެ އިންތިޒާރުގައި',
    pendingRevealShort: 'އިންތިޒާރުގައި',
    realAnswer: 'ޞައްޙަ ޖަވާބު:',
    revealedAnswers: 'ޖަވާބު ހާމަކުރެވިފައި',
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
    noAttendance: 'ޙާޟިރީ ރެކޯޑެއް އަދި ފެންނާކަށް ނެތެވެ.',
    submitContributionPayment: 'މެންބަރޝިޕް ފީ ދެއްކުން',
    submitSlipDesc: 'ބޭންކް އޮފް މޯލްޑިވްސް މެދުވެރިކޮށް ފީ ޓްރާންސްފަރ ކުރައްވައި، ސްލިޕް އަޕްލޯޑްކުރައްވާ.',
    bmlAccountName: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް',
    bmlBankTitle: 'ބޭންކް އޮފް މޯލްޑިވްސް (BML)',
    copyAccount: 'އެކައުންޓް ކޮޕީކުރައްވާ',
    copiedAcc: 'ކޮޕީ ވެއްޖެ!',
    payContributionBtn: 'ފީ ދައްކާ / ސްލިޕް އަޕްލޯޑްކުރައްވާ',
    viewHistoryBtn: 'ފީގެ ތަފްޞީލާއި ކަލަންޑަރު ބައްލަވާ',
    pendingVerificationBadge: 'ވެރިފައިކުރުމުގެ މަރުޙަލާގައި',
    slipsUnderReview: 'ސްލިޕް ވެރިފައިކުރުމުގެ މަރުޙަލާގައި',
    monthlyRateLabel: 'މަހު ފީ:',
    annualDiscountLabel: '12 މަހުގެ ފީ އެއްފަހަރާ ދައްކަވާނަމަ 1 މަހުގެ ފީ ޑިސްކައުންޓް ލިބޭނެ',
    quickSubmitTitle: 'އަވަހަށް ފީ ދައްކާ ސްލިޕް ފޮނުއްވާ',
    selectMonth: 'މަސް އިޚްތިޔާރު ކުރައްވާ',
    selectYear: 'އަހަރު',
    uploadSlip: 'ސްލިޕް އަޕްލޯޑް ކުރައްވާ',
    refNoOptional: 'ރިފަރެންސް ނަންބަރު (އިޚްތިޔާރީ)',
    openFullForm: 'ތަފްޞީލު ބައްލަވާ / ގިނަ މަސްތަކަށް ފީ ދައްކަވާ',
    submitPaymentBtn: 'ސްލިޕް ފޮނުއްވާ',
    submitting: 'ފޮނުވެނީ...',
    chooseSlipFile: 'ސްލިޕް ފައިލް އިޚްތިޔާރުކުރައްވާ (PNG, JPG, PDF)',
    amountToPay: 'ދައްކަންޖެހޭ މިންވަރު:'
  },
  english: {
    panelTitle: 'Members Panel',
    panelSub: 'ARC Portal',
    notConnected: 'Not Connected',
    welcome: 'Welcome,',
    bannerDesc: 'This is the official Members Panel of Ananda Recreation Club. Access your membership details, Ramadan quiz submissions, attendance history, lucky draw win records, and personal dues report here.',
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
    budgetTab: 'Budget & Dues',
    duesSummaryTitle: 'Membership Dues Summary',
    totalPaidDues: 'Paid Dues:',
    pendingDues: 'Pending Dues:',
    totalFines: 'Total Fines:',
    viewBudgetDetails: 'View Full Report',
    quizHistoryTitle: 'Ramadan Quiz Submission History',
    qNum: 'Question #',
    qTitle: 'Question Title',
    selectedAns: 'Selected Answer',
    result: 'Result',
    date: 'Date',
    answered: 'Submitted',
    correct: 'Correct',
    incorrect: 'Incorrect',
    pendingReveal: 'Awaiting Real Answer',
    pendingRevealShort: 'Pending Reveal',
    realAnswer: 'Real Answer:',
    revealedAnswers: 'Revealed Answers',
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
    noAttendance: 'No attendance records found yet.',
    submitContributionPayment: 'Submit Membership Contribution Payment',
    submitSlipDesc: 'Transfer your monthly dues to the official ARC bank account and upload your transfer slip for verification.',
    bmlAccountName: 'Aanandha Recreation Club',
    bmlBankTitle: 'Bank of Maldives (BML)',
    copyAccount: 'Copy Account #',
    copiedAcc: 'Copied!',
    payContributionBtn: 'Submit Payment & Upload Slip',
    viewHistoryBtn: 'View Statement & Calendar',
    pendingVerificationBadge: 'Under Review',
    slipsUnderReview: 'slip(s) awaiting verification',
    monthlyRateLabel: 'Monthly Rate:',
    annualDiscountLabel: 'Annual advance discount: Pay full year (12 months) and receive 1 month free!',
    quickSubmitTitle: 'Quick Submit Contribution Payment',
    selectMonth: 'Select Month',
    selectYear: 'Year',
    uploadSlip: 'Upload Transfer Slip',
    refNoOptional: 'Reference Number (Optional)',
    openFullForm: 'Open Detailed Calculator / Multi-Month Payment',
    submitPaymentBtn: 'Submit Payment Slip',
    submitting: 'Submitting...',
    chooseSlipFile: 'Choose Slip File (PNG, JPG, PDF)',
    amountToPay: 'Payable Amount:'
  }
};

export const MemberDashboardView: React.FC<MemberDashboardViewProps> = ({ user, onRefreshUser }) => {
  const { showToast } = useToast();
  const { lang, dir } = usePortalLanguage();
  const [data, setData] = useState<UserPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'quiz' | 'attendance' | 'wins' | 'budget'>('overview');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [widgetSettings, setWidgetSettings] = useState<MemberDashboardWidgetSettings>(DEFAULT_WIDGET_SETTINGS);

  // Self-Payment modal & contribution states for instant dashboard access
  const [payModalOpen, setPayModalOpen] = useState<boolean>(false);
  const [paymentRequests, setPaymentRequests] = useState<ContributionPaymentRequest[]>([]);
  const [settingsData, setSettingsData] = useState<MemberContributionSetting | null>(null);
  const [depositAccountData, setDepositAccountData] = useState<any>(null);
  const [myContributions, setMyContributions] = useState<MemberContributionRecord[]>([]);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);

  const txt = translations[lang];

  // Connect member modal/inline form state
  const [searchQuery, setSearchQuery] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const [res, secRes] = await Promise.all([
        api.getUserPerformance('me').catch(() => null),
        api.getContentSettings().catch(() => ({ settings: [] }))
      ]);

      setData(res);

      if (secRes?.settings) {
        const getVal = (k: keyof MemberDashboardWidgetSettings, def: boolean) => {
          const item = secRes.settings.find((s: any) => s.group === 'member_dashboard_widgets' && s.key === k);
          if (!item) return def;
          return typeof item.value === 'boolean' ? item.value : item.value === 'true';
        };

        setWidgetSettings({
          showWelcomeBanner: getVal('showWelcomeBanner', true),
          showProfileCard: getVal('showProfileCard', true),
          showStatsSummary: getVal('showStatsSummary', true),
          showBadges: getVal('showBadges', true),
          showQuizHistory: getVal('showQuizHistory', true),
          showWinsHistory: getVal('showWinsHistory', true),
          showAttendanceHistory: getVal('showAttendanceHistory', true),
          showClubRulesQuickButton: getVal('showClubRulesQuickButton', true),
          showQuizQuickButton: getVal('showQuizQuickButton', true),
          showFeePayQuickButton: getVal('showFeePayQuickButton', true),
          allowMemberConnectProfile: getVal('allowMemberConnectProfile', true),
          showBudgetStats: getVal('showBudgetStats', true),
          showPersonalBudgetReport: getVal('showPersonalBudgetReport', true)
        });
      }
    } catch (err: any) {
      console.warn('Failed to load user performance', err);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = Boolean(
    user.roleName === 'Admin' ||
    user.roleId === 'role_admin' ||
    user.roleName?.toLowerCase().includes('admin')
  );

  const fetchMyContributions = async () => {
    try {
      const res = await api.getMyContributions();
      if (res) {
        setPaymentRequests(res.paymentRequests || []);
        if (res.settings) setSettingsData(res.settings);
        if (res.depositAccount) setDepositAccountData(res.depositAccount);
        if (res.contributions) setMyContributions(res.contributions);
      }
    } catch (err) {
      console.warn('Could not load member contributions info:', err);
    }
  };

  useEffect(() => {
    fetchPerformance();
    fetchMyContributions();
  }, [user.id, user.memberId]);

  const handleCopyAccount = (accNum: string) => {
    navigator.clipboard.writeText(accNum);
    setCopiedAccount(true);
    showToast('success', lang === 'english' ? 'Account number copied to clipboard!' : 'އެކައުންޓް ނަންބަރު ކޮޕީ ކުރެވިއްޖެ!');
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handlePaymentSuccess = (newRequest: ContributionPaymentRequest) => {
    setPaymentRequests(prev => [newRequest, ...prev]);
    showToast('success', lang === 'english'
      ? `Payment request ${newRequest.requestNumber} submitted! Our finance team will review and verify it shortly.`
      : `ޕޭމަންޓް ރިކުއެސްޓް ${newRequest.requestNumber} ކާމިޔާބުކަމާއެކު ފޮނުވިއްޖެ! ވެރިފައިކުރުމަށްފަހު ފީ ރެކޯޑު އަޕްޑޭޓްވާނެއެވެ.`);
    setPayModalOpen(false);
    fetchPerformance();
    fetchMyContributions();
  };

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
  const budgetSummary = data?.budget?.summary;

  return (
    <div className="space-y-8" dir={dir}>
      
      {/* Top Banner: Welcome to Members Panel */}
      {widgetSettings.showWelcomeBanner && (
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
              {widgetSettings.showFeePayQuickButton && (
                <button
                  type="button"
                  id="top-banner-pay-fee-btn"
                  onClick={() => setPayModalOpen(true)}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{lang === 'english' ? 'Pay Membership Fee' : 'މެންބަރޝިޕް ފީ ދައްކަވާ'}</span>
                </button>
              )}

              {widgetSettings.showClubRulesQuickButton && (
                <button
                  type="button"
                  onClick={() => setShowRulesModal(true)}
                  className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-orange-400" />
                  <span>{txt.viewRules}</span>
                </button>
              )}

              {widgetSettings.showQuizQuickButton && (
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* Member Profile Connection Status Card */}
      {widgetSettings.showProfileCard && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          {linkedMember ? (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border-2 border-orange-500/40 text-orange-400 flex items-center justify-center text-lg font-black shrink-0 shadow-inner font-mono">
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

              {isAdmin && (
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => setShowConnectForm(!showConnectForm)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Link className="w-3.5 h-3.5 text-orange-400" />
                    <span>{lang === 'english' ? 'Change Profile' : 'ޕްރޮފައިލް ބަދަލުކުރައްވާ'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectMember}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>{txt.disconnectMember}</span>
                  </button>
                </div>
              )}
            </div>
          ) : isAdmin ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                    <Link className="w-4 h-4 text-orange-400" />
                    <span>{txt.connectHeader}</span>
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                    {txt.connectSub}
                  </p>
                </div>
              </div>

              <form onSubmit={handleConnectMember} className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={txt.placeholderInput}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-sans"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={connectLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 flex-1 sm:flex-initial shadow-lg shadow-orange-500/20 cursor-pointer"
                  >
                    {connectLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>{txt.connectSubmit}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center gap-3 text-xs text-slate-400">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-300">
                  {lang === 'english'
                    ? 'Member profile is not connected yet.'
                    : 'މެންބަރޝިޕް ޕްރޮފައިލް އަދި ގުޅުވާލެވިފައެއް ނެތެވެ.'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {lang === 'english'
                    ? 'Profile connections and modifications are managed exclusively by the System Administrator.'
                    : 'މެންބަރު ޕްރޮފައިލް ގުޅުވައި ބަދަލުކުރުމުގެ ހުއްދަ އޮންނާނީ ހަމައެކަނި ސިސްޓަމް އެޑްމިނިސްޓްރޭޓަރަށެވެ.'}
                </p>
              </div>
            </div>
          )}

          {/* If already connected and wants to switch profile (Admin Only) */}
          {isAdmin && linkedMember && showConnectForm && (
            <form onSubmit={handleConnectMember} className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={txt.placeholderInput}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-sans"
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

      {/* User Performance Key Metrics Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">{txt.loadingPerf}</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          
          {/* Member Individual Performance Status */}
          {widgetSettings.showStatsSummary && (
            <MemberPerformanceStatusCard
              data={data}
              onOpenReport={() => setShowPerformanceModal(true)}
            />
          )}

          {/* Tabbed Performance Records */}
          {(widgetSettings.showQuizHistory || widgetSettings.showWinsHistory || widgetSettings.showAttendanceHistory || widgetSettings.showPersonalBudgetReport) && (
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

                {widgetSettings.showPersonalBudgetReport && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('budget')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'budget'
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5 text-orange-400" />
                    <span>{txt.budgetTab}</span>
                    {budgetSummary && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        budgetSummary.pendingCount > 0 
                          ? 'bg-rose-500/20 text-rose-300 font-mono font-bold' 
                          : 'bg-emerald-500/20 text-emerald-300 font-mono'
                      }`}>
                        {budgetSummary.pendingCount > 0 ? `${budgetSummary.totalPending} MVR` : '✓'}
                      </span>
                    )}
                  </button>
                )}

                {widgetSettings.showQuizHistory && (
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
                )}
                {widgetSettings.showWinsHistory && (
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
                )}
                {widgetSettings.showAttendanceHistory && (
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
                )}
              </div>

              {/* TAB CONTENT: Personal Budget & Dues Report */}
              {widgetSettings.showPersonalBudgetReport && activeTab === 'budget' && (
                <MemberBudgetReportView
                  user={user}
                  budgetData={data.budget}
                  linkedMember={linkedMember}
                  lang={lang}
                />
              )}

              {/* TAB CONTENT: Quiz Submissions */}
              {widgetSettings.showQuizHistory && (activeTab === 'overview' || activeTab === 'quiz') && (
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
                              <td className="py-3 px-3 font-bold font-mono text-orange-400 align-top">
                                #{sub.questionNumber}
                              </td>
                              <td className="py-3 px-3 text-slate-300 font-semibold align-top space-y-1">
                                <div>{sub.selectedOptionText || txt.answered}</div>
                                {sub.isAnswerRevealed && sub.correctOptionText && !sub.isCorrect && (
                                  <div className="text-[11px] text-emerald-400 font-normal flex items-center gap-1">
                                    <span className="text-slate-400 font-semibold">{txt.realAnswer}</span>
                                    <span>{sub.correctOptionText}</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center align-top">
                                {sub.isAnswerRevealed ? (
                                  sub.isCorrect ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>{txt.correct}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold text-[10px] border border-rose-500/20">
                                      <XCircle className="w-3 h-3" />
                                      <span>{txt.incorrect}</span>
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold text-[10px] border border-amber-500/20">
                                    <Clock className="w-3 h-3 text-amber-400" />
                                    <span>{txt.pendingReveal}</span>
                                  </span>
                                )}
                              </td>
                              <td className={`py-3 px-3 ${lang === 'english' ? 'text-right' : 'text-left'} font-mono text-slate-500 text-[10px] align-top`}>
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
              {widgetSettings.showWinsHistory && (activeTab === 'overview' || activeTab === 'wins') && (
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
              {widgetSettings.showAttendanceHistory && (activeTab === 'overview' || activeTab === 'attendance') && (
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
        )}

        </div>
      ) : null}

      <ClubRulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />

      <PayContributionModal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        member={linkedMember || { fullName: user.fullName, memberNumber: user.username }}
        settings={settingsData}
        depositAccount={depositAccountData || {
          bankName: 'Bank of Maldives (BML)',
          accountName: 'Aanandha Recreation Club',
          accountNumber: '7730000308018',
          currency: 'MVR'
        }}
        contributions={myContributions}
        existingRequests={paymentRequests}
      />

      <UserPerformanceModal
        isOpen={showPerformanceModal}
        onClose={() => setShowPerformanceModal(false)}
        userId={user.id}
        userName={user.fullName || user.username}
      />
    </div>
  );
};
