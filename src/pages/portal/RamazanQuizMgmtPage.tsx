import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { QuizQuestion, QuizPrize, QuizSponsor } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { MarkNotEligibleModal } from '../../components/portal/MarkNotEligibleModal';
import { ClockTimePickerModal } from '../../components/common/ClockTimePickerModal';
import { ImageUploadInput } from '../../components/common/ImageUploadInput';
import { useToast } from '../../components/common/Toast';
import { useTableSync } from '../../hooks/useRealtimeSync';
import { formatDateTime, formatToMaldivesInput, parseMaldivesInputToISO, getThaanaOptionLabel, THAANA_LABELS } from '../../utils/formatters';
import { 
  Plus, Edit, Trash2, Play, Eye, Trophy, Sparkles, LayoutDashboard, HelpCircle, Clock,
  UserCheck, Award, Settings, Search, Download, RefreshCw, ShieldAlert, CheckCircle, XCircle,
  Gift, Building2, Tag, Image, Link as LinkIcon, Upload, User, FileText, BookOpen
} from 'lucide-react';

interface DateTime24InputProps {
  label: string;
  labelColorClass?: string;
  value: string;
  onChange: (newValue: string) => void;
  required?: boolean;
}

const DateTime24Input: React.FC<DateTime24InputProps> = ({
  label,
  labelColorClass = 'text-slate-400',
  value,
  onChange,
  required = true
}) => {
  let datePart = '';
  let timePart = '12:00';

  if (value) {
    const parts = value.split('T');
    datePart = parts[0] || '';
    if (parts[1]) {
      timePart = parts[1].slice(0, 5);
    }
  }

  const [timeText, setTimeText] = React.useState(timePart);
  const [clockModalOpen, setClockModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (timePart) {
      setTimeText(timePart);
    }
  }, [timePart]);

  const formatDDMMYYYY = (isoDateStr: string) => {
    if (!isoDateStr || !isoDateStr.includes('-')) return '--/--/----';
    const [y, m, d] = isoDateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleDateChange = (newDateStr: string) => {
    const validTime = timeText && /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(timeText) ? timeText : '12:00';
    const combined = `${newDateStr}T${validTime}`;
    onChange(combined);
  };

  const handleTimeSelect = (selectedTime: string) => {
    setTimeText(selectedTime);
    const combined = `${datePart || new Date().toISOString().slice(0, 10)}T${selectedTime}`;
    onChange(combined);
  };

  return (
    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className={`block text-[11px] font-bold ${labelColorClass}`}>
          {label} {required && '*'}
        </label>
        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-800/60 font-bold">
          {formatDDMMYYYY(datePart)} {timeText || timePart} (24-Hr)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-slate-400 block mb-1 font-semibold">Date (DD/MM/YYYY)</span>
          <input
            type="date"
            required={required}
            value={datePart}
            onChange={e => handleDateChange(e.target.value)}
            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:border-orange-500 focus:outline-none [color-scheme:dark]"
          />
        </div>

        <div>
          <span className="text-[10px] text-slate-400 block mb-1 font-semibold">Time (HH:mm)</span>
          <div className="relative flex items-center">
            <input
              type="time"
              required={required}
              value={timeText}
              onChange={e => handleTimeSelect(e.target.value)}
              className="w-full p-2 pr-8 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:border-orange-500 focus:outline-none [color-scheme:dark] cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setClockModalOpen(true)}
              className="absolute right-2 text-slate-400 hover:text-blue-400 transition-colors p-1"
              title="Open Clock Dial Picker"
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RADIAL CLOCK DIAL TIME PICKER MODAL */}
      <ClockTimePickerModal
        isOpen={clockModalOpen}
        onClose={() => setClockModalOpen(false)}
        initialTime={timeText || timePart}
        onSelectTime={(newTimeStr) => handleTimeSelect(newTimeStr)}
        title={`Set ${label} Time`}
      />
    </div>
  );
};

export const RamazanQuizMgmtPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin = (user?.roleName || user?.roleId || '').toLowerCase().includes('admin') || user?.roleId === 'role_admin' || hasPermission('quiz', 'canDelete');

  // Questions state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);

  // Delete Modal States
  const [questionToDelete, setQuestionToDelete] = useState<QuizQuestion | null>(null);
  const [prizeToDelete, setPrizeToDelete] = useState<QuizPrize | null>(null);
  const [sponsorToDelete, setSponsorToDelete] = useState<QuizSponsor | null>(null);
  const [submissionToDelete, setSubmissionToDelete] = useState<any | null>(null);
  const [masterParticipantToDelete, setMasterParticipantToDelete] = useState<any | null>(null);
  const [winnerToDelete, setWinnerToDelete] = useState<any | null>(null);

  // Question Form State
  const [questionNumber, setQuestionNumber] = useState(1);
  const [title, setTitle] = useState('Day 1 Quiz');
  const [questionText, setQuestionText] = useState('');
  const [questionImage, setQuestionImage] = useState('');
  const [showQuestionImage, setShowQuestionImage] = useState(true);
  const [options, setOptions] = useState<Array<{ id: string; optionLabel: string; optionText: string }>>([
    { id: 'opt_1', optionLabel: 'A', optionText: '' },
    { id: 'opt_2', optionLabel: 'B', optionText: '' },
    { id: 'opt_3', optionLabel: 'C', optionText: '' }
  ]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [answerExplanation, setAnswerExplanation] = useState('');
  const [selectedPrizeId, setSelectedPrizeId] = useState('');
  const [prizeTitle, setPrizeTitle] = useState('ARC Club Ramazan Gift Pack');
  const [prizeDescription, setPrizeDescription] = useState('');
  const [selectedSponsorId, setSelectedSponsorId] = useState('');
  const [sponsorName, setSponsorName] = useState('ARC Club');
  const [sponsorLogo, setSponsorLogo] = useState('');

  const [prizes, setPrizes] = useState<QuizPrize[]>([]);
  const [loadingPrizes, setLoadingPrizes] = useState(false);
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<QuizPrize | null>(null);

  // Prize Form State
  const [prizeFormTitle, setPrizeFormTitle] = useState('');
  const [prizeFormDescription, setPrizeFormDescription] = useState('');
  const [prizeFormSponsorName, setPrizeFormSponsorName] = useState('');
  const [prizeFormSponsorLogo, setPrizeFormSponsorLogo] = useState('');
  const [prizeFormValueAmount, setPrizeFormValueAmount] = useState('');
  const [prizeFormImage, setPrizeFormImage] = useState('');
  const [prizeFormStatus, setPrizeFormStatus] = useState<'active' | 'inactive'>('active');

  // Sponsors State
  const [sponsors, setSponsors] = useState<QuizSponsor[]>([]);
  const [loadingSponsors, setLoadingSponsors] = useState(false);
  const [sponsorModalOpen, setSponsorModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<QuizSponsor | null>(null);

  // Sponsor Form State
  const [sponsorFormName, setSponsorFormName] = useState('');
  const [sponsorFormLogo, setSponsorFormLogo] = useState('');
  const [sponsorFormAdText, setSponsorFormAdText] = useState('');
  const [sponsorFormProductImage, setSponsorFormProductImage] = useState('');
  const [sponsorFormWebsiteUrl, setSponsorFormWebsiteUrl] = useState('');
  const [sponsorFormStatus, setSponsorFormStatus] = useState<'active' | 'inactive'>('active');
  const [sponsorFormDisplayOrder, setSponsorFormDisplayOrder] = useState(1);

  // Timings & Deadlines State
  const [publishAt, setPublishAt] = useState('');
  const [closeAt, setCloseAt] = useState('');
  const [revealAt, setRevealAt] = useState('');
  const [drawStartAt, setDrawStartAt] = useState('');

  const formatForInput = (isoStr?: string) => {
    return formatToMaldivesInput(isoStr);
  };

  const formatToISO = (inputVal: string) => {
    return parseMaldivesInputToISO(inputVal);
  };

  const handlePublishAtChange = (newVal: string) => {
    setPublishAt(newVal);
    if (newVal) {
      const pubIso = parseMaldivesInputToISO(newVal);
      const pubMs = new Date(pubIso).getTime();
      if (!isNaN(pubMs)) {
        const curCloseIso = closeAt ? parseMaldivesInputToISO(closeAt) : '';
        const curCloseMs = curCloseIso ? new Date(curCloseIso).getTime() : 0;
        if (curCloseMs <= pubMs) {
          const newCloseIso = new Date(pubMs + 12 * 3600 * 1000).toISOString();
          setCloseAt(formatToMaldivesInput(newCloseIso));
          setDrawStartAt(formatToMaldivesInput(newCloseIso));
          setRevealAt(formatToMaldivesInput(new Date(pubMs + (12 * 3600 + 30) * 1000).toISOString()));
        }
      }
    }
  };

  const handleCloseAtChange = (newVal: string) => {
    setCloseAt(newVal);
    if (newVal) {
      const closeIso = parseMaldivesInputToISO(newVal);
      const closeMs = new Date(closeIso).getTime();
      if (!isNaN(closeMs)) {
        const curDrawIso = drawStartAt ? parseMaldivesInputToISO(drawStartAt) : '';
        const curDrawMs = curDrawIso ? new Date(curDrawIso).getTime() : 0;
        if (curDrawMs < closeMs) {
          setDrawStartAt(formatToMaldivesInput(closeIso));
        }
        const curRevealIso = revealAt ? parseMaldivesInputToISO(revealAt) : '';
        const curRevealMs = curRevealIso ? new Date(curRevealIso).getTime() : 0;
        if (curRevealMs < closeMs) {
          setRevealAt(formatToMaldivesInput(new Date(closeMs + 30 * 1000).toISOString()));
        }
      }
    }
  };

  const handleDrawStartAtChange = (newVal: string) => {
    setDrawStartAt(newVal);
    if (newVal) {
      const drawIso = parseMaldivesInputToISO(newVal);
      const drawMs = new Date(drawIso).getTime();
      if (!isNaN(drawMs)) {
        const curRevealIso = revealAt ? parseMaldivesInputToISO(revealAt) : '';
        const curRevealMs = curRevealIso ? new Date(curRevealIso).getTime() : 0;
        if (curRevealMs < drawMs) {
          setRevealAt(formatToMaldivesInput(new Date(drawMs + 30 * 1000).toISOString()));
        }
      }
    }
  };

  const handleRevealAtChange = (newVal: string) => {
    setRevealAt(newVal);
  };

  // Participants State (Answers Submissions)
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [questionFilter, setQuestionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Master Participants State (All time participant list for eligibility control)
  const [masterParticipants, setMasterParticipants] = useState<any[]>([]);
  const [loadingMasterParticipants, setLoadingMasterParticipants] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');
  const [masterStatusFilter, setMasterStatusFilter] = useState('all');

  // Winners State
  const [winners, setWinners] = useState<any[]>([]);
  const [loadingWinners, setLoadingWinners] = useState(false);

  // Not Eligible Confirmation Modal State
  const [notEligibleModalOpen, setNotEligibleModalOpen] = useState(false);
  const [notEligibleTargetIdentifier, setNotEligibleTargetIdentifier] = useState('');
  const [notEligibleCallback, setNotEligibleCallback] = useState<((reason: string) => Promise<void>) | null>(null);

  // Winner Modals State
  const [activeWinner, setActiveWinner] = useState<any | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactNameInput, setContactNameInput] = useState('');
  const [contactStatusSelect, setContactStatusSelect] = useState<'contacted' | 'not_contacted' | 'unreachable'>('contacted');

  const [winnerPrizeModalOpen, setWinnerPrizeModalOpen] = useState(false);
  const [prizeStatusSelect, setPrizeStatusSelect] = useState<'pending' | 'collected' | 'forfeited'>('collected');
  const [paymentSlipUrl, setPaymentSlipUrl] = useState('');
  const [paymentSlipPreview, setPaymentSlipPreview] = useState('');

  const [viewSlipModalOpen, setViewSlipModalOpen] = useState(false);
  const [selectedSlipUrl, setSelectedSlipUrl] = useState('');

  // Quiz Settings State
  const [quizSettings, setQuizSettings] = useState<any>({
    quizHeaderTitle: 'ރަމަޟާން 1447 ދުވަހުގެ ކުއިޒް',
    quizHeaderDescription: 'މިއަދުގެ ސުވާލަށް ރަނގަޅު ޖަވާބު ދެއްވައިގެން ގުރާތުގައި ބައިވެރިވެ އަގުހުރި އިނާމު ހޯއްދަވާ!',
    winnerDisplayDurationSeconds: 10,
    defaultPrizeTitle: 'ARC Club Ramazan Gift Pack',
    defaultSponsorName: 'Ananda Recreation Club',
    requireValidIdFormat: true,
    allowDuplicateSubmissions: false,
    quizTermsAndRules: '1. ކޮންމެ ބައިވެރިއަކަށްވެސް ދުވާލަކު ބައިވެރިވެވޭނީ 1 ފަހަރުއެވެ.\n2. ނަސީބުވެރިޔާ ހޮވޭނީ ރަނގަޅު ޖަވާބު ދެއްވާ ބައިވެރިންގެ ތެރެއިން ގުރާތުންނެވެ.\n3. ވަނަ ލިބޭ ފަރާތުގެ އައިޑީ ކާޑާއި ފޯނު ނަންބަރު ސައްޙަވާންޖެހޭނެއެވެ.'
  });
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Quiz Dashboard Stats State
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Fetch Questions
  const fetchQuestions = async () => {
    try {
      setLoadingQuestions(true);
      const res = await api.getQuizQuestions();
      setQuestions(res || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load questions.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Fetch Quiz Dashboard Stats
  const fetchDashboardStats = async () => {
    try {
      setLoadingDashboard(true);
      const res = await api.getDashboardStats();
      setDashboardStats(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Fetch Participants
  const fetchParticipants = async () => {
    try {
      setLoadingParticipants(true);
      const res = await api.getParticipants({
        search: participantSearch,
        questionId: questionFilter !== 'all' ? questionFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      setParticipants(res.participants || res || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load participants.');
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Fetch Master Participants (All time unique list)
  const fetchMasterParticipants = async () => {
    try {
      setLoadingMasterParticipants(true);
      const res = await api.getMasterParticipants({
        search: masterSearch,
        status: masterStatusFilter !== 'all' ? masterStatusFilter : undefined
      });
      setMasterParticipants(res.participants || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load master participant list.');
    } finally {
      setLoadingMasterParticipants(false);
    }
  };

  const handleToggleMasterEligibility = (p: any) => {
    const idNumber = p.normalizedIdNumber || p.idNumber;
    if (p.isNotEligible) {
      if (window.confirm(`Restore eligibility for participant ID ${idNumber}?`)) {
        api.toggleMasterParticipantEligibility(idNumber, false, '').then(() => {
          showToast('success', 'Participant restored to Eligible.');
          fetchMasterParticipants();
          fetchParticipants();
        }).catch((err: any) => showToast('error', err.message || 'Failed to update eligibility.'));
      }
    } else {
      setNotEligibleTargetIdentifier(`ID Card: ${idNumber} (${p.contactNumber || p.maskedContactNumber || 'Phone N/A'})`);
      setNotEligibleCallback(() => async (reason: string) => {
        await api.toggleMasterParticipantEligibility(idNumber, true, reason);
        showToast('success', 'Participant ID marked as Not Eligible.');
        fetchMasterParticipants();
        fetchParticipants();
      });
      setNotEligibleModalOpen(true);
    }
  };

  // Fetch Winners
  const fetchWinners = async () => {
    try {
      setLoadingWinners(true);
      const res = await api.getWinners();
      setWinners(res.winners || res || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load winners.');
    } finally {
      setLoadingWinners(false);
    }
  };

  // Fetch Quiz Settings
  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await api.getContentSettings();
      const settingsList = res.settings || [];
      const quizGroup = settingsList.filter((s: any) => s.group === 'quiz');
      
      const newSettings = { ...quizSettings };
      quizGroup.forEach((item: any) => {
        if (item.key in newSettings) {
          (newSettings as any)[item.key] = item.value;
        }
      });
      setQuizSettings(newSettings);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchQuestions();
      fetchDashboardStats();
      fetchPrizes();
      fetchSponsors();
    }
  }, [user]);

  const canViewQuiz = hasPermission('ramazan_quiz', 'canView');
  const canViewParticipants = hasPermission('quiz_participants', 'canView');
  const canViewWinners = hasPermission('quiz_winners', 'canView');

  const allSubTabs = [
    { key: 'dashboard', label: 'ކުއިޒް ޑޭޝްބޯޑު', icon: LayoutDashboard, canView: canViewQuiz },
    { key: 'questions', label: `ސުވާލުތައް (${questions.length})`, icon: HelpCircle, canView: canViewQuiz },
    { key: 'participants', label: 'ބައިވެރިންގެ ޖަވާބުތައް (Submissions)', icon: FileText, canView: canViewParticipants || canViewQuiz },
    { key: 'master_participants', label: 'އެންމެހައި ބައިވެރިން (Eligibility Control)', icon: UserCheck, canView: canViewParticipants || canViewQuiz },
    { key: 'winners', label: 'ނަސީބުވެރިން', icon: Award, canView: canViewWinners || canViewQuiz },
    { key: 'settings', label: 'ކުއިޒް ސެޓިންގްސް', icon: Settings, canView: canViewQuiz }
  ];

  const allowedSubTabs = allSubTabs.filter(t => t.canView);
  const requestedTab = searchParams.get('tab');
  const currentTab = allowedSubTabs.some(t => t.key === requestedTab)
    ? (requestedTab as string)
    : (allowedSubTabs[0]?.key || 'dashboard');

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (currentTab === 'participants') {
      fetchParticipants();
    } else if (currentTab === 'master_participants') {
      fetchMasterParticipants();
    } else if (currentTab === 'winners') {
      fetchWinners();
    } else if (currentTab === 'settings') {
      fetchSettings();
      fetchPrizes();
      fetchSponsors();
    } else if (currentTab === 'dashboard') {
      fetchDashboardStats();
    }
  }, [currentTab, questionFilter, statusFilter, masterStatusFilter]);

  // Real-time table sync for Ramazan Quiz tables
  useTableSync(
    [
      'quiz_questions',
      'quiz_submissions',
      'quiz_winners',
      'quiz_prizes',
      'quiz_sponsors',
      'quizQuestions',
      'quizSubmissions',
      'quizWinners',
      'quizPrizes',
      'quizSponsors',
      'masterIneligibleParticipants'
    ],
    () => {
      fetchQuestions();
      if (currentTab === 'participants') {
        fetchParticipants();
      } else if (currentTab === 'master_participants') {
        fetchMasterParticipants();
      } else if (currentTab === 'winners') {
        fetchWinners();
      } else if (currentTab === 'settings') {
        fetchSettings();
        fetchPrizes();
        fetchSponsors();
      } else if (currentTab === 'dashboard') {
        fetchDashboardStats();
      }
    }
  );

  // Fetch Prizes
  const fetchPrizes = async () => {
    try {
      setLoadingPrizes(true);
      const res = await api.getPrizes();
      setPrizes(res || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingPrizes(false);
    }
  };

  // Fetch Sponsors
  const fetchSponsors = async () => {
    try {
      setLoadingSponsors(true);
      const res = await api.getSponsors();
      setSponsors(res || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingSponsors(false);
    }
  };

  // Prize Handlers
  const handleOpenCreatePrize = () => {
    setEditingPrize(null);
    setPrizeFormTitle('');
    setPrizeFormDescription('');
    setPrizeFormSponsorName('');
    setPrizeFormSponsorLogo('');
    setPrizeFormValueAmount('');
    setPrizeFormImage('');
    setPrizeFormStatus('active');
    setPrizeModalOpen(true);
  };

  const handleOpenEditPrize = (p: QuizPrize) => {
    setEditingPrize(p);
    setPrizeFormTitle(p.title);
    setPrizeFormDescription(p.description || '');
    setPrizeFormSponsorName(p.sponsorName || '');
    setPrizeFormSponsorLogo(p.sponsorLogo || '');
    setPrizeFormValueAmount(p.valueAmount || '');
    setPrizeFormImage(p.image || '');
    setPrizeFormStatus(p.status || 'active');
    setPrizeModalOpen(true);
  };

  const handleSavePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: prizeFormTitle,
        description: prizeFormDescription,
        sponsorName: prizeFormSponsorName,
        sponsorLogo: prizeFormSponsorLogo,
        valueAmount: prizeFormValueAmount,
        image: prizeFormImage,
        status: prizeFormStatus
      };
      if (editingPrize) {
        await api.updatePrize(editingPrize.id, payload);
        showToast('success', 'Prize updated successfully');
      } else {
        await api.createPrize(payload);
        showToast('success', 'Prize created successfully');
      }
      setPrizeModalOpen(false);
      fetchPrizes();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save prize');
    }
  };

  const handleDeletePrize = (p: QuizPrize) => {
    setPrizeToDelete(p);
  };

  const handleConfirmDeletePrize = async () => {
    if (!prizeToDelete) return;
    try {
      await api.deletePrize(prizeToDelete.id);
      showToast('success', 'Prize deleted successfully');
      fetchPrizes();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete prize');
    } finally {
      setPrizeToDelete(null);
    }
  };

  // Sponsor Handlers
  const handleOpenCreateSponsor = () => {
    setEditingSponsor(null);
    setSponsorFormName('');
    setSponsorFormLogo('');
    setSponsorFormAdText('');
    setSponsorFormProductImage('');
    setSponsorFormWebsiteUrl('');
    setSponsorFormStatus('active');
    setSponsorFormDisplayOrder(sponsors.length + 1);
    setSponsorModalOpen(true);
  };

  const handleOpenEditSponsor = (s: QuizSponsor) => {
    setEditingSponsor(s);
    setSponsorFormName(s.name);
    setSponsorFormLogo(s.logo || '');
    setSponsorFormAdText(s.adText || '');
    setSponsorFormProductImage(s.specialProductImage || '');
    setSponsorFormWebsiteUrl(s.websiteUrl || '');
    setSponsorFormStatus(s.status || 'active');
    setSponsorFormDisplayOrder(s.displayOrder || 1);
    setSponsorModalOpen(true);
  };

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: sponsorFormName,
        logo: sponsorFormLogo,
        adText: sponsorFormAdText,
        specialProductImage: sponsorFormProductImage,
        websiteUrl: sponsorFormWebsiteUrl,
        status: sponsorFormStatus,
        displayOrder: Number(sponsorFormDisplayOrder)
      };
      if (editingSponsor) {
        await api.updateSponsor(editingSponsor.id, payload);
        showToast('success', 'Sponsor updated successfully');
      } else {
        await api.createSponsor(payload);
        showToast('success', 'Sponsor created successfully');
      }
      setSponsorModalOpen(false);
      fetchSponsors();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save sponsor');
    }
  };

  const handleDeleteSponsor = (s: QuizSponsor) => {
    setSponsorToDelete(s);
  };

  const handleConfirmDeleteSponsor = async () => {
    if (!sponsorToDelete) return;
    try {
      await api.deleteSponsor(sponsorToDelete.id);
      showToast('success', 'Sponsor deleted successfully');
      fetchSponsors();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete sponsor');
    } finally {
      setSponsorToDelete(null);
    }
  };

  // Question CRUD
  const handleAddOption = () => {
    const nextIdx = options.length;
    const nextLabel = THAANA_LABELS[nextIdx] || `Opt ${nextIdx + 1}`;
    setOptions([
      ...options,
      { id: `opt_${Date.now()}_${nextIdx + 1}`, optionLabel: nextLabel, optionText: '' }
    ]);
  };

  const handleRemoveOption = (indexToRemove: number) => {
    if (options.length <= 2) {
      showToast('error', 'At least 2 options are required.');
      return;
    }
    const updated = options.filter((_, idx) => idx !== indexToRemove).map((opt, idx) => ({
      ...opt,
      optionLabel: THAANA_LABELS[idx] || opt.optionLabel
    }));
    setOptions(updated);
    if (correctOptionIndex >= updated.length) {
      setCorrectOptionIndex(updated.length - 1);
    } else if (correctOptionIndex === indexToRemove) {
      setCorrectOptionIndex(0);
    }
  };

  const handleOpenCreateQuestion = () => {
    setEditingQuestion(null);
    setQuestionNumber(questions.length + 1);
    setTitle(`Day ${questions.length + 1} Ramazan Quiz`);
    setQuestionText('');
    setQuestionImage('');
    setShowQuestionImage(true);
    setOptions([
      { id: 'opt_1', optionLabel: 'ހ', optionText: '' },
      { id: 'opt_2', optionLabel: 'ށ', optionText: '' },
      { id: 'opt_3', optionLabel: 'ނ', optionText: '' }
    ]);
    setCorrectOptionIndex(0);
    setAnswerExplanation('');
    setSelectedPrizeId(quizSettings.defaultPrizeId || '');
    setPrizeTitle(quizSettings.defaultPrizeTitle || 'ARC Club Ramazan Gift Pack');
    setPrizeDescription(quizSettings.defaultPrizeDescription || '');
    setSelectedSponsorId(quizSettings.defaultSponsorId || '');
    setSponsorName(quizSettings.defaultSponsorName || 'Ananda Recreation Club');
    setSponsorLogo(quizSettings.defaultSponsorLogo || '');

    const now = new Date();
    const pubIso = now.toISOString();
    const closeIso = new Date(now.getTime() + 12 * 3600 * 1000).toISOString();
    const drawIso = closeIso;
    const revealIso = new Date(now.getTime() + (12 * 3600 + 30) * 1000).toISOString();

    setPublishAt(formatForInput(pubIso));
    setCloseAt(formatForInput(closeIso));
    setDrawStartAt(formatForInput(drawIso));
    setRevealAt(formatForInput(revealIso));

    setQuestionModalOpen(true);
  };

  const handleOpenEditQuestion = (q: QuizQuestion) => {
    setEditingQuestion(q);
    setQuestionNumber(q.questionNumber);
    setTitle(q.title || `Day ${q.questionNumber}`);
    setQuestionText(q.questionText);
    setQuestionImage(q.questionImage || '');
    setShowQuestionImage(q.showQuestionImage !== false);
    setOptions(q.options || []);
    const cIdx = q.options.findIndex(o => o.id === q.correctOptionId);
    setCorrectOptionIndex(cIdx >= 0 ? cIdx : 0);
    setAnswerExplanation(q.answerExplanation || '');
    setSelectedPrizeId(q.prizeId || quizSettings.defaultPrizeId || '');
    setPrizeTitle(q.prizeTitle || quizSettings.defaultPrizeTitle || 'ARC Club Ramazan Gift Pack');
    setPrizeDescription(q.prizeDescription || quizSettings.defaultPrizeDescription || '');
    setSelectedSponsorId(q.sponsorId || quizSettings.defaultSponsorId || '');
    setSponsorName(q.sponsorName || quizSettings.defaultSponsorName || 'Ananda Recreation Club');
    setSponsorLogo(q.sponsorLogo || quizSettings.defaultSponsorLogo || '');

    setPublishAt(formatForInput(q.publishAt));
    setCloseAt(formatForInput(q.closeAt));
    setRevealAt(formatForInput(q.revealAt || q.drawStartAt || q.closeAt));
    if (q.drawStartAt) {
      setDrawStartAt(formatForInput(q.drawStartAt));
    } else if (q.closeAt) {
      setDrawStartAt(formatForInput(q.closeAt));
    } else {
      setDrawStartAt('');
    }

    setQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText || options.some(o => !o.optionText)) {
      showToast('error', 'Please fill in question text and all option choices.');
      return;
    }

    const correctOptionId = options[correctOptionIndex]?.id || options[0].id;
    const publishAtIso = formatToISO(publishAt);
    const closeAtIso = formatToISO(closeAt);
    const drawStartAtIso = drawStartAt ? formatToISO(drawStartAt) : closeAtIso;
    const revealAtIso = revealAt ? formatToISO(revealAt) : drawStartAtIso;

    const pubMs = new Date(publishAtIso).getTime();
    const closeMs = new Date(closeAtIso).getTime();
    const drawMs = new Date(drawStartAtIso).getTime();
    const revealMs = new Date(revealAtIso).getTime();

    if (isNaN(pubMs)) {
      showToast('error', 'Please enter a valid publishing start date & time.');
      return;
    }
    if (isNaN(closeMs)) {
      showToast('error', 'Please enter a valid submit deadline date & time.');
      return;
    }
    if (isNaN(drawMs)) {
      showToast('error', 'Please enter a valid number rolling date & time.');
      return;
    }
    if (isNaN(revealMs)) {
      showToast('error', 'Please enter a valid winner announcement date & time.');
      return;
    }

    // Chronological validation:
    // 1. Deadline time cannot be set before publishing time
    if (closeMs <= pubMs) {
      showToast('error', 'Submit deadline time (ސުންގަޑި) cannot be set before publishing time (ޝާއިޢުކުރާ ގަޑި).');
      return;
    }

    // 2. Number rolling time cannot be set before deadline time
    if (drawMs < closeMs) {
      showToast('error', 'Number rolling time (ނަންބަރު ރޯލްކުރާ ގަޑި) cannot be set before deadline time (ސުންގަޑި).');
      return;
    }

    // 3. Winner announcement time cannot be set before number rolling time
    if (revealMs < drawMs) {
      showToast('error', 'Winner announcement time (ނަސީބުވެރިޔާ ހާމަކުރާ ގަޑި) cannot be set before number rolling time (ނަންބަރު ރޯލްކުރާ ގަޑި).');
      return;
    }

    const payload = {
      questionNumber: Number(questionNumber),
      title: `Day ${Number(questionNumber)}`,
      questionText,
      questionImage,
      showQuestionImage,
      options,
      correctOptionId,
      answerExplanation,
      prizeId: quizSettings.defaultPrizeId || undefined,
      prizeTitle: quizSettings.defaultPrizeTitle || 'ARC Club Ramazan Gift Pack',
      prizeDescription: quizSettings.defaultPrizeDescription || '',
      sponsorId: quizSettings.defaultSponsorId || undefined,
      sponsorName: quizSettings.defaultSponsorName || 'Ananda Recreation Club',
      sponsorLogo: quizSettings.defaultSponsorLogo || '',
      rollingDurationSeconds: 10,
      publishAt: formatToISO(publishAt),
      closeAt: closeAtIso,
      revealAt: revealAtIso,
      drawStartAt: drawStartAtIso
    };

    try {
      if (editingQuestion) {
        await api.updateQuizQuestion(editingQuestion.id, payload);
        showToast('success', 'Quiz question updated successfully.');
      } else {
        await api.createQuizQuestion(payload);
        showToast('success', 'New quiz question created.');
      }
      setQuestionModalOpen(false);
      fetchQuestions();
      fetchDashboardStats();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save question.');
    }
  };

  const handleStatusAction = async (id: string, state: string) => {
    try {
      await api.updateQuizStatus(id, state);
      showToast('success', `Quiz question status set to ${(state || '').replace(/_/g, ' ')}`);
      fetchQuestions();
      fetchDashboardStats();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update status.');
    }
  };

  const handleTriggerDraw = async (id: string) => {
    if (!confirm('Execute the secure rolling lucky draw for this question?')) return;
    try {
      const res = await api.triggerLuckyDraw(id);
      showToast('success', `Lucky draw complete! Winning entry #: ${res.winner.participantNumber}`);
      fetchQuestions();
      fetchDashboardStats();
      fetchWinners();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to run lucky draw.');
    }
  };

  const handleDeleteQuestion = (q: QuizQuestion) => {
    setQuestionToDelete(q);
  };

  const handleConfirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    try {
      await api.deleteQuizQuestion(questionToDelete.id);
      showToast('success', 'Question and its associated winner & submissions deleted successfully.');
      fetchQuestions();
      fetchDashboardStats();
      fetchWinners();
      fetchParticipants();
      fetchMasterParticipants();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete question.');
    } finally {
      setQuestionToDelete(null);
    }
  };

  // Participant Actions
  const handleDisqualifyParticipant = (p: any) => {
    if (p.isDisqualified) {
      if (window.confirm(`Restore participant entry #${p.participantNumber}?`)) {
        api.disqualifyParticipant(p.id, false, '').then(() => {
          showToast('success', 'Participant entry restored to eligible.');
          fetchParticipants();
        }).catch((err: any) => showToast('error', err.message || 'Failed to restore entry.'));
      }
    } else {
      setNotEligibleTargetIdentifier(`Entry #${p.participantNumber} (ID Card: ${p.normalizedIdNumber || p.idNumber || p.maskedIdNumber})`);
      setNotEligibleCallback(() => async (reason: string) => {
        await api.disqualifyParticipant(p.id, true, reason);
        showToast('success', 'Participant entry marked as Not Eligible.');
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
      a.download = `ARC_Quiz_Participants_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      showToast('success', 'Participant submissions exported to CSV.');
    } catch (err: any) {
      showToast('error', err.message || 'Export failed.');
    }
  };

  // Winner Actions
  const handleOpenContactModal = (w: any) => {
    setActiveWinner(w);
    setContactNameInput(w.fullName && w.fullName !== 'Winner Participant' ? w.fullName : '');
    const isCont = w.contactedStatus === 'contacted' || w.isContacted;
    setContactStatusSelect(isCont ? 'not_contacted' : 'contacted');
    setContactModalOpen(true);
  };

  const handleSaveContactStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWinner) return;

    if (!contactNameInput.trim()) {
      showToast('error', 'To change contact status, you must write the name of the participant.');
      return;
    }

    try {
      await api.updateWinnerStatus(activeWinner.id, {
        contactedStatus: contactStatusSelect,
        isContacted: contactStatusSelect === 'contacted',
        participantName: contactNameInput.trim(),
        fullName: contactNameInput.trim()
      });
      showToast('success', 'Winner contact status updated successfully.');
      setContactModalOpen(false);
      fetchWinners();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update contact status.');
    }
  };

  const handleOpenPrizeModal = (w: any) => {
    setActiveWinner(w);
    const isCol = w.prizeCollectionStatus === 'collected' || w.isPrizeCollected;
    setPrizeStatusSelect(isCol ? 'pending' : 'collected');
    setPaymentSlipUrl(w.paymentSlipUrl || '');
    setPaymentSlipPreview(w.paymentSlipUrl || '');
    setWinnerPrizeModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPaymentSlipUrl(result);
        setPaymentSlipPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePrizeStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWinner) return;

    if (prizeStatusSelect === 'collected' && !paymentSlipUrl.trim()) {
      showToast('error', 'To change prize collection status to collected, you must upload a payment slip.');
      return;
    }

    try {
      await api.updateWinnerStatus(activeWinner.id, {
        prizeCollectionStatus: prizeStatusSelect,
        isPrizeCollected: prizeStatusSelect === 'collected',
        paymentSlipUrl: paymentSlipUrl.trim()
      });
      showToast('success', 'Prize collection status & payment slip saved.');
      setWinnerPrizeModalOpen(false);
      fetchWinners();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update prize status.');
    }
  };

  const handleViewSlip = (url: string) => {
    setSelectedSlipUrl(url);
    setViewSlipModalOpen(true);
  };

  const handleReselectWinner = (w: any) => {
    setNotEligibleTargetIdentifier(`Winner Entry #${w.participantNumber} (Day ${w.questionNumber || 'Quiz'})`);
    setNotEligibleCallback(() => async (reason: string) => {
      const res = await api.reselectWinner(w.questionId, reason);
      showToast('success', `Replacement winner selected: ${res.winner.participantNumber}`);
      fetchWinners();
    });
    setNotEligibleModalOpen(true);
  };

  const handleDeleteSubmission = async () => {
    if (!submissionToDelete) return;
    try {
      await api.deleteQuizParticipant(submissionToDelete.id);
      showToast('success', 'Participant submission deleted successfully.');
      setSubmissionToDelete(null);
      fetchParticipants();
      fetchMasterParticipants();
      fetchWinners();
      fetchQuestions();
      fetchDashboardStats();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete submission.');
    }
  };

  const handleDeleteMasterParticipant = async () => {
    if (!masterParticipantToDelete) return;
    try {
      const idNumber = masterParticipantToDelete.normalizedIdNumber || masterParticipantToDelete.idNumber || masterParticipantToDelete.id;
      await api.deleteMasterParticipant(idNumber);
      showToast('success', `Participant (ID: ${idNumber}) and all associated submissions deleted.`);
      setMasterParticipantToDelete(null);
      fetchMasterParticipants();
      fetchParticipants();
      fetchQuestions();
      fetchWinners();
      fetchDashboardStats();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete participant from master list.');
    }
  };

  const handleDeleteWinner = async () => {
    if (!winnerToDelete) return;
    try {
      await api.deleteQuizWinner(winnerToDelete.id);
      showToast('success', 'Winner record deleted.');
      setWinnerToDelete(null);
      fetchWinners();
      fetchQuestions();
      fetchDashboardStats();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete winner.');
    }
  };

  // Settings Save
  const handleSaveQuizSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = Object.entries(quizSettings).map(([key, value]) => ({
        group: 'quiz',
        key,
        value
      }));
      await api.updateContentSettings(payload);
      showToast('success', 'Quiz module settings saved.');
      fetchQuestions();
      fetchDashboardStats();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save settings.');
    }
  };

  const handleApplyImageToAllQuestions = async () => {
    if (!quizSettings.defaultQuestionImage) {
      showToast('error', 'Please upload or select a Default Question Image first.');
      return;
    }
    if (!window.confirm('Are you sure you want to apply this image to ALL existing questions?')) return;
    try {
      let updatedCount = 0;
      for (const q of questions) {
        await api.updateQuizQuestion(q.id, {
          ...q,
          questionImage: quizSettings.defaultQuestionImage,
          showQuestionImage: quizSettings.showQuestionImage !== false
        });
        updatedCount++;
      }
      showToast('success', `Applied image to ${updatedCount} questions!`);
      fetchQuestions();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update questions.');
    }
  };

  const handleApplyPrizeAndSponsorToAllQuestions = async () => {
    if (!quizSettings.defaultPrizeTitle || !quizSettings.defaultSponsorName) {
      showToast('error', 'Please fill in Default Prize Title and Default Sponsor Name first.');
      return;
    }
    if (!window.confirm(`Are you sure you want to apply Prize "${quizSettings.defaultPrizeTitle}" and Sponsor "${quizSettings.defaultSponsorName}" to ALL existing questions?`)) return;
    try {
      let updatedCount = 0;
      for (const q of questions) {
        await api.updateQuizQuestion(q.id, {
          ...q,
          prizeTitle: quizSettings.defaultPrizeTitle,
          prizeDescription: quizSettings.defaultPrizeDescription || q.prizeDescription || '',
          sponsorName: quizSettings.defaultSponsorName,
          sponsorLogo: quizSettings.defaultSponsorLogo || q.sponsorLogo || '',
          prizeId: quizSettings.defaultPrizeId || q.prizeId,
          sponsorId: quizSettings.defaultSponsorId || q.sponsorId
        });
        updatedCount++;
      }
      showToast('success', `Applied Prize & Sponsor to ${updatedCount} questions!`);
      fetchQuestions();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update questions.');
    }
  };

  return (
    <PortalLayout currentModule="ramazan_quiz" title="ރަމަޟާން ކުއިޒް މޮޑިއުލް">
      <div className="space-y-6">
        
        {/* Module Header & Sub-Nav Tabs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">ARC Ramazan Quiz</span>
              <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-white">ރަމަޟާން ކުއިޒް މޮޑިއުލް</h2>
              <p className="text-xs text-slate-400 mt-1">
                ކުއިޒް ސުވާލުތައް، ބައިވެރިންގެ ޖަވާބުތައް، ނަސީބުވެރިން އަދި ކުއިޒް ސެޓިންގްސް އެއްތަނަކުން.
              </p>
            </div>

            {currentTab === 'questions' && (
              <button
                type="button"
                onClick={handleOpenCreateQuestion}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>އަލަށް ސުވާލެއް އިތުރުކުރައްވާ</span>
              </button>
            )}

            {currentTab === 'participants' && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-orange-400" />
                <span>CSV ރިޕޯޓް ޑައުންލޯޑް</span>
              </button>
            )}
          </div>

          {/* Module Sub-Tabs */}
          <div className="flex items-center gap-2 border-t border-slate-800/80 pt-4 overflow-x-auto custom-scrollbar">
            {allowedSubTabs.map(subTab => {
              const Icon = subTab.icon;
              return (
                <button
                  key={subTab.key}
                  type="button"
                  onClick={() => setTab(subTab.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                    currentTab === subTab.key
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{subTab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: QUIZ DASHBOARD */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            {loadingDashboard || !dashboardStats ? (
              <div className="py-12 text-center text-slate-400">ކުއިޒް ޑޭޝްބޯޑު މައުލޫމާތު ލޯޑުވަނީ...</div>
            ) : (
              <>
                {/* Active Quiz Focus Card */}
                {dashboardStats.activeQuiz ? (
                  <div className="bg-gradient-to-r from-orange-950/60 via-slate-900 to-slate-900 border border-orange-500/30 rounded-3xl p-6 sm:p-8 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-orange-500/20 pb-4">
                      <div>
                        <span className="text-xs font-extrabold uppercase tracking-widest text-orange-400">މިއަދުގެ ސުވާލު (Day {dashboardStats.activeQuiz.questionNumber})</span>
                      </div>
                      <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold uppercase bg-orange-500 text-slate-950">
                        {(dashboardStats?.activeQuiz?.state || '').replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-sm text-slate-200 font-medium">{dashboardStats.activeQuiz.questionText}</p>

                    <div className="flex items-center gap-3 pt-2 flex-wrap">
                      {dashboardStats.activeQuiz.state === 'open' && (
                        <button
                          type="button"
                          onClick={() => handleStatusAction(dashboardStats.activeQuiz.id, 'closed')}
                          className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-400"
                        >
                          ކުއިޒް ބަންދުކުރައްވާ
                        </button>
                      )}
                      {dashboardStats.activeQuiz.state === 'closed' && (
                        <button
                          type="button"
                          onClick={() => handleStatusAction(dashboardStats.activeQuiz.id, 'answer_revealed')}
                          className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-400"
                        >
                          ރަނގަޅު ޖަވާބު ހާމަކުރައްވާ
                        </button>
                      )}
                      {['answer_revealed', 'draw_running'].includes(dashboardStats.activeQuiz.state) && (
                        <button
                          type="button"
                          onClick={() => handleTriggerDraw(dashboardStats.activeQuiz.id)}
                          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-xs font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-lg"
                        >
                          <Trophy className="w-4 h-4" />
                          <span>ނަސީބުވެރިޔާ ހޮއްވަވާ (Rolling Draw)</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setTab('questions')}
                        className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:text-white"
                      >
                        ސުވާލުތަކުގެ ލިސްޓު ބައްލަވާ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
                    <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-sm text-slate-400">މިވަގުތު ހުޅުވާލެވިފައިވާ ކުއިޒް ސުވާލެއް ނެތެވެ.</p>
                    <button
                      type="button"
                      onClick={() => setTab('questions')}
                      className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold inline-block"
                    >
                      ސުވާލެއް ހުޅުވާލައްވާ
                    </button>
                  </div>
                )}

                {/* Quiz Module Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">ޖުމްލަ ސުވާލުތައް</span>
                    <p className="text-3xl font-bold text-white font-mono">{dashboardStats.totalQuestions || 0}</p>
                    <p className="text-xs text-slate-500">ރަމަޟާން މަހުގެ ސުވާލުތައް</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">ޖުމްލަ ޖަވާބުތައް</span>
                    <p className="text-3xl font-bold text-white font-mono">{dashboardStats.totalParticipants || 0}</p>
                    <p className="text-xs text-orange-400">ރަނގަޅު ޖަވާބު: {dashboardStats.correctParticipants || 0}</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">ޤުރްއާނުން ހޮވުނު ނަސީބުވެރިން</span>
                    <p className="text-3xl font-bold text-white font-mono">{dashboardStats.totalWinners || 0}</p>
                    <p className="text-xs text-slate-500">ލަކީޑްރޯއިން ހޮވިފައިވާ ފަރާތްތައް</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">އިނާމު ޙަވާލުކުރެވުނު</span>
                    <p className="text-3xl font-bold text-white font-mono">{winners.filter(w => w.isPrizeCollected).length}</p>
                    <p className="text-xs text-sky-400">ކަށަވަރު ކުރެވުނު އިނާމުތައް</p>
                  </div>
                </div>

                {/* Recent Submissions Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-orange-400" />
                      <span>އެންމެ ފަހުން ލިބުނު ޖަވާބުތައް</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setTab('participants')}
                      className="text-xs text-orange-400 font-bold hover:underline"
                    >
                      ހުރިހާ ޖަވާބުތައް ބައްލަވާ →
                    </button>
                  </div>

                  {dashboardStats.recentSubmissions?.length === 0 ? (
                    <p className="text-xs text-slate-500">އަދި އެއްވެސް ޖަވާބެއް ލިބިފައެއް ނެތެވެ.</p>
                  ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider">
                          <tr>
                            <th className="p-3 rounded-l-xl">Entry #</th>
                            <th className="p-3">ID Number</th>
                            <th className="p-3">Selected Option</th>
                            <th className="p-3">Result</th>
                            <th className="p-3 rounded-r-xl">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200">
                          {dashboardStats.recentSubmissions?.map((s: any) => (
                            <tr key={s.id}>
                              <td className="p-3 font-mono font-bold text-orange-400">{s.participantNumber}</td>
                              <td className="p-3 font-mono text-white font-medium">{s.normalizedIdNumber || s.idNumber || s.maskedIdNumber}</td>
                              <td className="p-3 font-bold">{s.selectedOptionLabel}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  s.isCorrect ? 'bg-orange-950 text-orange-400' : 'bg-rose-950 text-rose-400'
                                }`}>
                                  {s.isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-400 font-mono text-xs">{formatDateTime(s.submittedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: QUESTIONS MANAGEMENT */}
        {currentTab === 'questions' && (
          <div className="space-y-4">
            {loadingQuestions ? (
              <div className="py-12 text-center text-slate-400">ސުވާލުތައް ލޯޑުވަނީ...</div>
            ) : questions.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                <p className="text-sm text-slate-400">އަދި އެއްވެސް ކުއިޒް ސުވާލެއް ހެދިފައެއް ނެތެވެ.</p>
                <button
                  type="button"
                  onClick={handleOpenCreateQuestion}
                  className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs"
                >
                  ސުވާލެއް ހައްދަވާ
                </button>
              </div>
            ) : (
              questions.map(q => {
                const winnerForQ = winners.find(w => w.questionId === q.id && !w.isReplaced);

                return (
                  <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase tracking-wider text-orange-400">Day {q.questionNumber}</span>
                          <span className="text-[11px] text-slate-500 font-mono">({q.id})</span>
                        </div>
                        <div className="flex items-center gap-2.5 flex-wrap mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 font-medium" title="Created Date & Time">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Created: {q.createdAt ? formatDateTime(q.createdAt) : (q.publishAt ? formatDateTime(q.publishAt) : 'N/A')}</span>
                          </span>
                          <span className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-emerald-300 font-medium" title="Publish Start Date & Time">
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Start: {q.publishAt ? formatDateTime(q.publishAt) : 'Not Set'}</span>
                          </span>
                          <span className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-orange-300 font-medium" title="Submit Deadline">
                            <Clock className="w-3.5 h-3.5 text-orange-400" />
                            <span>Deadline: {q.closeAt ? formatDateTime(q.closeAt) : 'Not Set'}</span>
                          </span>
                          <span className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-amber-300 font-medium" title="Reveal / Winner Announcement Time">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Reveal: {q.revealAt ? formatDateTime(q.revealAt) : 'Not Set'}</span>
                          </span>
                          {q.prizeTitle && (
                            <span className="flex items-center gap-1.5 bg-amber-950/60 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-800/80 font-semibold">
                              <Trophy className="w-3.5 h-3.5 text-amber-400" />
                              <span>Prize: {q.prizeTitle}</span>
                            </span>
                          )}
                          {q.sponsorName && (
                            <span className="flex items-center gap-1.5 bg-sky-950/60 text-sky-300 px-2.5 py-1 rounded-lg border border-sky-800/80 font-semibold">
                              <Building2 className="w-3.5 h-3.5 text-sky-400" />
                              <span>Sponsor: {q.sponsorName}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          q.status === 'open' ? 'bg-orange-950 text-orange-400 border border-orange-800' :
                          q.status === 'answer_revealed' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          q.status === 'winner_announced' ? 'bg-sky-950 text-sky-400 border border-sky-800' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {(q?.status || '').replace(/_/g, ' ')}
                        </span>

                        {q.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleStatusAction(q.id, 'open')}
                            className="px-3 py-1 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-400"
                          >
                            Publish & Open
                          </button>
                        )}

                        {q.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => handleStatusAction(q.id, 'closed')}
                            className="px-3 py-1 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-amber-400"
                          >
                            Close Quiz
                          </button>
                        )}

                        {q.status === 'closed' && (
                          <button
                            type="button"
                            onClick={() => handleStatusAction(q.id, 'answer_revealed')}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-400"
                          >
                            Reveal Answer
                          </button>
                        )}

                        {['answer_revealed', 'draw_running'].includes(q.status) && (
                          <button
                            type="button"
                            onClick={() => handleTriggerDraw(q.id)}
                            className="px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-xs font-bold hover:scale-105 transition-transform flex items-center gap-1"
                          >
                            <Trophy className="w-3.5 h-3.5" />
                            <span>Run Draw</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEditQuestion(q)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                          title="Edit Question"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q)}
                          className="p-1.5 rounded-lg bg-rose-950/60 text-rose-400 hover:bg-rose-900 hover:text-white border border-rose-800/60 transition-colors"
                          title="Delete Question & Winner Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {winnerForQ && (
                      <div className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border border-amber-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                            <Trophy className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-amber-400 font-heading">RECORDED WINNER:</span>
                              <span className="font-mono font-bold text-white text-sm bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{winnerForQ.participantNumber}</span>
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase border border-amber-500/30">
                                Recorded Winner (Fixed until question deleted)
                              </span>
                            </div>
                            <p className="text-slate-300 text-[11px] mt-1">
                              ID: <strong className="font-mono text-white">{winnerForQ.idNumber || winnerForQ.maskedIdNumber}</strong> | Phone: <strong className="font-mono text-orange-300">{winnerForQ.contactNumber || winnerForQ.maskedContactNumber}</strong>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTab('winners')}
                          className="text-xs text-amber-400 font-bold hover:underline self-end sm:self-auto flex items-center gap-1"
                        >
                          <span>View Winner Details</span>
                          <span>→</span>
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                    <p className="text-sm text-slate-200 font-medium">{q.questionText}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = opt.id === q.correctOptionId;
                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                              isCorrect ? 'bg-orange-950 border-orange-500 text-orange-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="font-bold">{getThaanaOptionLabel(opt.optionLabel, optIdx)}:</span>
                            <span>{opt.optionText}</span>
                            {isCorrect && <span className="ml-auto font-bold uppercase text-[10px] text-orange-400">Correct Choice</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        )}

        {/* TAB 3: PARTICIPANTS / SUBMISSIONS */}
        {currentTab === 'participants' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={participantSearch}
                  onChange={e => setParticipantSearch(e.target.value)}
                  placeholder="Search ID, phone, number..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={questionFilter}
                  onChange={e => setQuestionFilter(e.target.value)}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="all">All Questions</option>
                  {questions.map(q => (
                    <option key={q.id} value={q.id}>Day {q.questionNumber}{q.questionText ? `: ${q.questionText.slice(0, 40)}...` : ''}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="all">All Results</option>
                  <option value="correct">Correct Only</option>
                  <option value="eligible">Eligible Only</option>
                  <option value="disqualified">Disqualified Only</option>
                </select>
              </div>
            </div>

            {loadingParticipants ? (
              <div className="py-12 text-center text-slate-400">ބައިވެރިންގެ ޖަވާބުތައް ލޯޑުވަނީ...</div>
            ) : participants.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
                އެއްވެސް ޖަވާބެއް ފެންނާކަށް ނެތެވެ.
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="p-3.5">Entry #</th>
                        <th className="p-3.5">ID Card Number</th>
                        <th className="p-3.5">Contact Phone</th>
                        <th className="p-3.5">Option</th>
                        <th className="p-3.5">Result</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Submitted At</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-200">
                      {participants.map(p => (
                        <tr key={p.id} className="hover:bg-slate-800/30">
                          <td className="p-3.5 font-mono font-bold text-orange-400">{p.participantNumber}</td>
                          <td className="p-3.5 font-mono text-white font-medium">{p.normalizedIdNumber || p.idNumber || p.maskedIdNumber}</td>
                          <td className="p-3.5 font-mono text-orange-300 font-medium">{p.contactNumber || p.maskedContactNumber}</td>
                          <td className="p-3.5 font-bold">{p.selectedOptionLabel}</td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.isCorrect ? 'bg-orange-950 text-orange-400' : 'bg-rose-950 text-rose-400'
                            }`}>
                              {p.isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              p.isDisqualified ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                              (p.isEligibleForDraw || p.isEligible || (p.isCorrect && !p.isDisqualified)) ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {p.isDisqualified ? 'Disqualified' : (p.isEligibleForDraw || p.isEligible || (p.isCorrect && !p.isDisqualified)) ? 'Eligible' : 'Ineligible'}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400 font-mono text-[11px]">{formatDateTime(p.submittedAt)}</td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleDisqualifyParticipant(p)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                                  p.isDisqualified
                                    ? 'bg-orange-950 text-orange-400 hover:bg-orange-900'
                                    : 'bg-rose-950 text-rose-400 hover:bg-rose-900'
                                }`}
                              >
                                {p.isDisqualified ? 'Restore Entry' : 'Disqualify'}
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setSubmissionToDelete(p)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition-colors"
                                  title="Delete Submission (Admin Only)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
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

        {/* TAB 3.5: ALL TIME MASTER PARTICIPANTS LIST (Mark Eligible / Not) */}
        {currentTab === 'master_participants' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-orange-400" />
                  <span>އެންމެހައި ބައިވެރިންގެ މާސްޓަރ ލިސްޓު (All-Time Participant Master List)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ވަކިވަކި ބައިވެރިން 'ނުހިމެނޭ' (Not Eligible) ކަމަށް ކަނޑައެޅުން. ބައިވެރިއަކު ނުހިމެނޭ ކަމަށް ކަނޑައަޅައިފިނަމަ، އެ އައިޑީއަކުން ފޮނުވާ ހުރިހާ ޖަވާބެއް 'Not Eligible' ކަމަށް ދައްކާނެއެވެ.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={masterSearch}
                    onChange={e => setMasterSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchMasterParticipants()}
                    placeholder="އައިޑީ ނަމބަރު / ފޯނު ނަންބަރު..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <select
                  value={masterStatusFilter}
                  onChange={e => setMasterStatusFilter(e.target.value)}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white w-full sm:w-auto"
                >
                  <option value="all">ހުރިހާ ބައިވެރިން (All Statuses)</option>
                  <option value="eligible">ޤާބިލު ބައިވެރިން (Eligible Only)</option>
                  <option value="not_eligible">ނުހިމެނޭ ބައިވެރިން (Not Eligible Only)</option>
                </select>
              </div>
            </div>

            {loadingMasterParticipants ? (
              <div className="py-12 text-center text-slate-400">ބައިވެރިންގެ މާސްޓަރ ލިސްޓު ލޯޑުވަނީ...</div>
            ) : masterParticipants.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
                އެއްވެސް ބައިވެރިއަކު ފެންނާކަށް ނެތެވެ.
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="p-3.5">ID / Passport Number</th>
                        <th className="p-3.5">Contact Phone</th>
                        <th className="p-3.5 text-center">Total Answers Submitted</th>
                        <th className="p-3.5 text-center">Correct Answers</th>
                        <th className="p-3.5 text-center">Overall Eligibility</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-200">
                      {masterParticipants.map((p: any) => (
                        <tr key={p.normalizedIdNumber} className="hover:bg-slate-800/30">
                          <td className="p-3.5 font-mono text-white font-bold">{p.normalizedIdNumber || p.idNumber}</td>
                          <td className="p-3.5 font-mono text-orange-300 font-medium">{p.contactNumber || p.maskedContactNumber}</td>
                          <td className="p-3.5 text-center font-mono font-bold text-slate-300">{p.totalSubmissions}</td>
                          <td className="p-3.5 text-center font-mono font-bold text-orange-400">{p.correctCount}</td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              p.isNotEligible
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            }`}>
                              {p.isNotEligible ? 'Not Eligible (ނުހިމެނޭ)' : 'Eligible (ޤާބިލު)'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleMasterEligibility(p)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  p.isNotEligible
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                                }`}
                              >
                                {p.isNotEligible ? 'Mark Eligible' : 'Mark Not Eligible'}
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setMasterParticipantToDelete(p)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition-colors"
                                  title="Delete Participant from Master List (Admin Only)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
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

        {/* TAB 4: WINNERS & LUCKY DRAW */}
        {currentTab === 'winners' && (
          <div className="space-y-4">
            {loadingWinners ? (
              <div className="py-12 text-center text-slate-400">ނަސީބުވެރިންގެ ލިސްޓު ލޯޑުވަނީ...</div>
            ) : winners.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
                އަދި އެއްވެސް ނަސީބުވެރިއަކު ހޮވިފައެއް ނެތެވެ.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {winners.map(w => {
                  const isContacted = w.contactedStatus === 'contacted' || w.isContacted;
                  const isCollected = w.prizeCollectionStatus === 'collected' || w.isPrizeCollected;
                  const unmaskedId = w.idNumber || w.normalizedIdNumber || w.maskedIdNumber;
                  const unmaskedPhone = w.contactNumber || w.maskedContactNumber;

                  return (
                    <div key={w.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-xl">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-400" />
                            <span className="text-sm font-bold text-white font-heading">Question Day {w.questionNumber || 'Quiz'}</span>
                          </div>
                          <span className="font-mono text-lg font-bold text-orange-400">{w.participantNumber}</span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <p className="text-slate-300 flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Participant Name:</span>
                            <span className="text-white font-bold">{w.fullName || 'Not set'}</span>
                          </p>
                          <p className="text-slate-300 flex items-center justify-between">
                            <span className="text-slate-400 font-medium">ID Card Number:</span>
                            <span className="font-mono text-white font-bold">{unmaskedId}</span>
                          </p>
                          <p className="text-slate-300 flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Contact Phone:</span>
                            <span className="font-mono text-orange-300 font-bold">{unmaskedPhone}</span>
                          </p>
                          <p className="text-slate-300 flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Prize:</span>
                            <span className="text-amber-400 font-semibold">{w.prizeTitle}</span>
                          </p>
                          {w.sponsorName && (
                            <p className="text-slate-300 flex items-center justify-between">
                              <span className="text-slate-400 font-medium">Sponsor:</span>
                              <span className="text-sky-300">{w.sponsorName}</span>
                            </p>
                          )}
                          <p className="text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
                            Drawn At: {formatDateTime(w.drawnAt || w.selectedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-800">
                        {/* Contact Status Row */}
                        <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <div>
                            <span className="block text-slate-400 text-[10px] uppercase font-bold">Contact Status</span>
                            <span className={`font-bold ${isContacted ? 'text-orange-400' : 'text-slate-400'}`}>
                              {w.contactedStatus === 'unreachable' ? 'Unreachable' : isContacted ? 'Contacted' : 'Not Contacted'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenContactModal(w)}
                            className="px-3 py-1.5 rounded-lg font-bold text-[11px] bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 border border-slate-700"
                          >
                            <User className="w-3.5 h-3.5 text-orange-400" />
                            <span>Update Contact</span>
                          </button>
                        </div>

                        {/* Prize Collection Row */}
                        <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <div>
                            <span className="block text-slate-400 text-[10px] uppercase font-bold">Prize Collection</span>
                            <span className={`font-bold ${isCollected ? 'text-sky-400' : 'text-amber-400'}`}>
                              {isCollected ? 'Collected' : 'Pending'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {w.paymentSlipUrl && (
                              <button
                                type="button"
                                onClick={() => handleViewSlip(w.paymentSlipUrl)}
                                className="px-2.5 py-1.5 rounded-lg bg-sky-950 text-sky-300 hover:bg-sky-900 border border-sky-800 font-bold text-[11px] flex items-center gap-1"
                                title="View Payment Slip"
                              >
                                <Eye className="w-3.5 h-3.5 text-sky-400" />
                                <span>Slip</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenPrizeModal(w)}
                              className="px-3 py-1.5 rounded-lg font-bold text-[11px] bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 border border-slate-700"
                            >
                              <Upload className="w-3.5 h-3.5 text-sky-400" />
                              <span>Update Prize</span>
                            </button>
                          </div>
                        </div>

                        <div className="pt-1 space-y-2">
                          <button
                            type="button"
                            onClick={() => handleReselectWinner(w)}
                            className="w-full py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>އާ ނަސީބުވެރިއެއް ހޮއްވަވާ</span>
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setWinnerToDelete(w)}
                              className="w-full py-2 bg-slate-950 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                              title="Delete Winner Record (Admin Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>ނަސީބުވެރިޔާގެ ރެކޯޑު ފޮހެލާ (Delete Winner)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: QUIZ MODULE SETTINGS */}
        {currentTab === 'settings' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-3xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white font-heading">ކުއިޒް މޮޑިއުލް ސެޓިންގްސް</h3>
              <p className="text-xs text-slate-400">ކުއިޒް ގަވާއިދުތައް، ލަކީޑްރޯ ދެމެހެއްޓޭ ވަގުތު އަދި އިނާމު ސެޓިންގްސް.</p>
            </div>

            <form onSubmit={handleSaveQuizSettings} className="space-y-5">
              {/* Quiz Main Title & Subtitle Settings */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span>Public Quiz Header & Description (ކުއިޒް ސުރުޚީ އަދި ތަޢާރަފް)</span>
                </h4>
                
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Quiz Banner Title (ކުއިޒް ސުރުޚީ)
                  </label>
                  <input
                    type="text"
                    value={quizSettings.quizHeaderTitle || ''}
                    onChange={e => setQuizSettings({ ...quizSettings, quizHeaderTitle: e.target.value })}
                    placeholder="ރަމަޟާން 1447 ދުވަހުގެ ކުއިޒް"
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Quiz Subtitle / Description (ކުއިޒް ތަޢާރަފް / ތަފްޞީލް)
                  </label>
                  <textarea
                    rows={2}
                    value={quizSettings.quizHeaderDescription || ''}
                    onChange={e => setQuizSettings({ ...quizSettings, quizHeaderDescription: e.target.value })}
                    placeholder="މިއަދުގެ ސުވާލަށް ރަނގަޅު ޖަވާބު ދެއްވައިގެން ގުރާތުގައި ބައިވެރިވެ އަގުހުރި އިނާމު ހޯއްދަވާ!"
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white leading-relaxed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Winner Display Duration (Seconds)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={quizSettings.winnerDisplayDurationSeconds}
                    onChange={e => setQuizSettings({ ...quizSettings, winnerDisplayDurationSeconds: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              {/* Default Prize & Sponsor for All Questions */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      Default Prize & Sponsor (Global for All Questions)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Configure the prize and sponsor assigned automatically to all quiz questions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyPrizeAndSponsorToAllQuestions}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Apply to ALL Questions</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                      Select Preset Prize
                    </label>
                    <select
                      value={quizSettings.defaultPrizeId || ''}
                      onChange={e => {
                        const id = e.target.value;
                        const p = prizes.find(pr => pr.id === id);
                        setQuizSettings({
                          ...quizSettings,
                          defaultPrizeId: id,
                          defaultPrizeTitle: p ? p.title : quizSettings.defaultPrizeTitle,
                          defaultPrizeDescription: p ? (p.description || '') : quizSettings.defaultPrizeDescription,
                          defaultSponsorName: (p && p.sponsorName) ? p.sponsorName : quizSettings.defaultSponsorName,
                          defaultSponsorLogo: (p && p.sponsorLogo) ? p.sponsorLogo : quizSettings.defaultSponsorLogo
                        });
                      }}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                    >
                      <option value="">-- Custom Entry --</option>
                      {prizes.map(p => (
                        <option key={p.id} value={p.id}>{p.title} ({p.sponsorName || 'No Sponsor'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                      Select Preset Sponsor
                    </label>
                    <select
                      value={quizSettings.defaultSponsorId || ''}
                      onChange={e => {
                        const id = e.target.value;
                        const s = sponsors.find(sp => sp.id === id);
                        setQuizSettings({
                          ...quizSettings,
                          defaultSponsorId: id,
                          defaultSponsorName: s ? s.name : quizSettings.defaultSponsorName,
                          defaultSponsorLogo: s ? (s.logo || '') : quizSettings.defaultSponsorLogo
                        });
                      }}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                    >
                      <option value="">-- Custom Entry --</option>
                      {sponsors.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                      Default Prize Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={quizSettings.defaultPrizeTitle || ''}
                      onChange={e => setQuizSettings({ ...quizSettings, defaultPrizeTitle: e.target.value })}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                      Default Sponsor Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={quizSettings.defaultSponsorName || ''}
                      onChange={e => setQuizSettings({ ...quizSettings, defaultSponsorName: e.target.value })}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizSettings.requireValidIdFormat}
                    onChange={e => setQuizSettings({ ...quizSettings, requireValidIdFormat: e.target.checked })}
                    className="w-4 h-4 rounded text-orange-500 bg-slate-950 border-slate-800"
                  />
                  <span className="text-xs font-medium text-slate-200">
                    Require National ID Format Verification (Maldivian ID Card Check)
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizSettings.allowDuplicateSubmissions}
                    onChange={e => setQuizSettings({ ...quizSettings, allowDuplicateSubmissions: e.target.checked })}
                    className="w-4 h-4 rounded text-orange-500 bg-slate-950 border-slate-800"
                  />
                  <span className="text-xs font-medium text-slate-200">
                    Allow Multiple Entries per ID (Default: Restricted to 1 entry per day)
                  </span>
                </label>
              </div>

              {/* Default Question Image & Visibility Settings */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    <span>Default Question Image (Applied to questions)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleApplyImageToAllQuestions}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold transition-all self-start sm:self-auto"
                  >
                    Apply Image to All Questions
                  </button>
                </div>

                <ImageUploadInput
                  label="Default Question Image / Background Illustration"
                  value={quizSettings.defaultQuestionImage || ''}
                  onChange={imgUrl => setQuizSettings({ ...quizSettings, defaultQuestionImage: imgUrl })}
                  placeholder="Upload or select image for all questions..."
                />

                <div className="pt-2 border-t border-slate-900 flex items-center justify-between flex-wrap gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={quizSettings.showQuestionImage !== false}
                      onChange={e => setQuizSettings({ ...quizSettings, showQuestionImage: e.target.checked })}
                      className="w-4 h-4 rounded text-orange-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-xs font-semibold text-slate-200">
                      Show Question Image on Public Quiz Board (ސުވާލުގެ ތަސްވީރު ދައްކަވާ)
                    </span>
                  </label>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded ${
                    quizSettings.showQuestionImage !== false
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                  }`}>
                    {quizSettings.showQuestionImage !== false ? 'Show (Visible)' : 'Hide (Hidden)'}
                  </span>
                </div>
              </div>

              {/* Quiz Rules & Terms Field */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <BookOpen className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    ކުއިޒުގެ ގަވާއިދުތައް (Quiz Rules & Terms Notice)
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  އާންމުންނަށް ކުއިޒް ބޯޑުން "ކުއިޒުގެ ގަވާއިދު" ބަޓަނަށް ފިތާލުމުން ފެންނާނެ ގަވާއިދުތައް މިތަނުގައި ލިޔުއްވާ.
                </p>
                <textarea
                  rows={6}
                  value={quizSettings.quizTermsAndRules || ''}
                  onChange={e => setQuizSettings({ ...quizSettings, quizTermsAndRules: e.target.value })}
                  placeholder="1. ކޮންމެ ބައިވެރިއަކަށްވެސް ދުވާލަކު ބައިވެރިވެވޭނީ 1 ފަހަރުއެވެ..."
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white leading-relaxed focus:border-amber-500/50 focus:outline-none font-sans"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20"
                >
                  ސެޓިންގްސް ސޭވްކުރައްވާ
                </button>
              </div>
            </form>

            {/* PRIZES CRUD MANAGEMENT SECTION */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-white font-heading flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span>Quiz Prizes Management (އިނާމުތަކުގެ ސެޓިންގްސް)</span>
                  </h4>
                  <p className="text-xs text-slate-400">ސުވާލުތަކަށް ކަނޑައެޅޭ އިނާމުތައް ހެދުމާއި އިޞްލާޙުކުރުން.</p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreatePrize}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>އިނާމެއް އިތުރުކުރައްވާ</span>
                </button>
              </div>

              {prizes.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-950 border border-slate-800 rounded-xl">
                  އަދި އެއްވެސް އިނާމެއް އިތުރުކުރެވިފައެއް ނެތެވެ.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prizes.map(p => (
                    <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="font-bold text-white text-sm">{p.title}</h5>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'active' ? 'bg-orange-950 text-orange-400 border border-orange-800' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                        {p.description && <p className="text-xs text-slate-400">{p.description}</p>}
                        {p.sponsorName && (
                          <p className="text-xs text-sky-400 font-medium flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Sponsor: {p.sponsorName}</span>
                          </p>
                        )}
                        {p.valueAmount && (
                          <p className="text-xs text-amber-400 font-mono font-bold">Value: {p.valueAmount}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPrize(p)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePrize(p)}
                          className="px-3 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SPONSORS CRUD MANAGEMENT SECTION */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-white font-heading flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-sky-400" />
                    <span>Quiz Sponsors Management (ސްޕޮންސަރުންގެ ސެޓިންގްސް)</span>
                  </h4>
                  <p className="text-xs text-slate-400">ކުއިޒް ސްޕޮންސަރުން، އިޝްތިހާރު އަދި ޚާއްޞަ އުފެއްދުންތަކުގެ މަޢުލޫމާތު.</p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateSponsor}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>ސްޕޮންސަރެއް އިތުރުކުރައްވާ</span>
                </button>
              </div>

              {sponsors.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-950 border border-slate-800 rounded-xl">
                  އަދި އެއްވެސް ސްޕޮންސަރެއް އިތުރުކުރެވިފައެއް ނެތެވެ.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sponsors.map(s => (
                    <div key={s.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {s.logo ? (
                              <img src={s.logo} alt={s.name} className="w-7 h-7 rounded-lg object-cover bg-slate-800" />
                            ) : (
                              <Building2 className="w-6 h-6 text-sky-400" />
                            )}
                            <h5 className="font-bold text-white text-sm">{s.name}</h5>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.status === 'active' ? 'bg-orange-950 text-orange-400 border border-orange-800' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {s.status}
                          </span>
                        </div>
                        {s.adText && <p className="text-xs text-slate-300 italic">"{s.adText}"</p>}
                        {s.specialProductImage && (
                          <div className="mt-1">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Special Product:</span>
                            <img src={s.specialProductImage} alt="Product" className="w-full h-24 object-cover rounded-lg border border-slate-800 mt-1" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <span className="text-[11px] text-slate-500 font-mono">Order: #{s.displayOrder || 1}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSponsor(s)}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSponsor(s)}
                            className="px-3 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Create / Edit Question Modal */}
      <Modal
        isOpen={questionModalOpen}
        onClose={() => setQuestionModalOpen(false)}
        title={editingQuestion ? 'ސުވާލު އިޞްލާޙުކުރައްވާ' : 'އަލަށް ކުއިޒް ސުވާލެއް ހައްދަވާ'}
        maxWidth="4xl"
      >
        <form onSubmit={handleSaveQuestion} className="space-y-4">
          {editingQuestion && (
            <div className="flex items-center justify-between gap-3 flex-wrap p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Question ID:</span>
                <span className="font-mono text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{editingQuestion.id}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Created: <strong className="text-white font-mono">{editingQuestion.createdAt ? formatDateTime(editingQuestion.createdAt) : (editingQuestion.publishAt ? formatDateTime(editingQuestion.publishAt) : 'N/A')}</strong></span>
                </span>
                {editingQuestion.updatedAt && (
                  <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                    <span>Updated: {formatDateTime(editingQuestion.updatedAt)}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Day # *</label>
            <input
              type="number"
              required
              min={1}
              value={questionNumber}
              onChange={e => setQuestionNumber(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Question Text *</label>
            <textarea
              rows={3}
              required
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          {/* Question Image with Show / Hide Option */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <ImageUploadInput
              label="Question Image / Illustration"
              value={questionImage}
              onChange={setQuestionImage}
              placeholder="Select or drop question image file..."
            />
            {questionImage && (
              <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showQuestionImage}
                    onChange={e => setShowQuestionImage(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-semibold text-slate-200">
                    Show Question Image on Public Quiz Board (ސުވާލުގެ ތަސްވީރު ދައްކަވާ)
                  </span>
                </label>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  showQuestionImage
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                    : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                }`}>
                  {showQuestionImage ? 'Visible (Show)' : 'Hidden (Hide)'}
                </span>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase text-slate-400">Options & Correct Selection *</label>
              <button
                type="button"
                onClick={handleAddOption}
                className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold text-[11px] flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Option</span>
              </button>
            </div>
            {options.map((opt, idx) => (
              <div key={opt.id || `opt_${idx}`} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctOptionChoice"
                  checked={correctOptionIndex === idx}
                  onChange={() => setCorrectOptionIndex(idx)}
                  className="w-4 h-4 text-orange-500 bg-slate-950 border-slate-700 cursor-pointer"
                  title="Select as correct option"
                />
                <span className="w-6 font-bold text-xs text-orange-400">{getThaanaOptionLabel(opt.optionLabel, idx)}:</span>
                <input
                  type="text"
                  required
                  value={opt.optionText}
                  onChange={e => {
                    const newOpts = [...options];
                    newOpts[idx].optionText = e.target.value;
                    setOptions(newOpts);
                  }}
                  placeholder={`Option ${getThaanaOptionLabel(opt.optionLabel, idx)} Choice`}
                  className="flex-1 p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Remove option"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Global Quiz Prize & Sponsor Info Banner */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold shrink-0">
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  ކުއިޒް އިނާމު އަދި ސްޕޮންސަރ (Global Quiz Prize & Sponsor)
                </span>
                <span className="text-xs font-bold text-white">
                  {quizSettings.defaultPrizeTitle || 'ARC Club Ramazan Gift Pack'}
                </span>
                {quizSettings.defaultSponsorName && (
                  <span className="text-xs text-amber-300 font-semibold ml-1.5">
                    ({quizSettings.defaultSponsorName})
                  </span>
                )}
              </div>
            </div>
            <span className="text-[10px] text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800/80 font-bold shrink-0">
              ކުއިޒްގެ އިނާމު
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Answer Explanation</label>
            <textarea
              rows={2}
              value={answerExplanation}
              onChange={e => setAnswerExplanation(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          {/* Quiz Schedules & Deadlines */}
          <div className="space-y-3.5 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-orange-400">
                Quiz Timings & Schedules
              </label>
              <span className="text-[10px] text-slate-400 font-mono">24-Hour Format</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DateTime24Input
                label="1. ޝާއިޢުކުރާ ގަޑި (Publish Start DD/MM/YYYY)"
                labelColorClass="text-sky-400"
                value={publishAt}
                onChange={handlePublishAtChange}
                required
              />

              <DateTime24Input
                label="2. ސުންގަޑި (Submit Deadline DD/MM/YYYY)"
                labelColorClass="text-amber-400"
                value={closeAt}
                onChange={handleCloseAtChange}
                required
              />

              <DateTime24Input
                label="3. ނަންބަރު ރޯލްކުރާ ގަޑި (Number Rolling DD/MM/YYYY)"
                labelColorClass="text-emerald-400"
                value={drawStartAt}
                onChange={handleDrawStartAtChange}
                required
              />

              <DateTime24Input
                label="4. ނަސީބުވެރިޔާ ހާމަކުރާ ގަޑި (Winner Reveal DD/MM/YYYY)"
                labelColorClass="text-purple-400"
                value={revealAt}
                onChange={handleRevealAtChange}
                required
              />
            </div>

            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-[11px] text-slate-300 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <Sparkles className="w-4 h-4 shrink-0 text-orange-400" />
                <span>ކުއިޒް ހިނގާނެ ތަރުތީބު (Quiz Automated Lifecycle Flow):</span>
              </div>
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-sky-400 shrink-0">1. ޝާއިޢުކުރާ ގަޑި:</span>
                <span>ސުވާލާއި އިޚްތިޔާރުތައް ޕަބްލިކް ސައިޓުގައި ފެނި، ޖަވާބު ދިނުމުގެ ފުރުޞަތު ހުޅުވި ޓައިމަރު ހިނގަން ފަށާނެއެވެ.</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-amber-400 shrink-0">2. ސުންގަޑި:</span>
                <span>ޖަވާބު ދިނުމުގެ ފުރުޞަތު ބަންދުވާނެއެވެ.</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-emerald-400 shrink-0">3. ނަންބަރު ރޯލްކުރާ ގަޑި:</span>
                <span>ރަނގަޅު ޖަވާބު ބޯޑުގައި ހާމަވެ، ރަނގަޅު ޖަވާބު ދިން ބައިވެރިންގެ ނަންބަރުތައް ލައިވްކޮށް ރޯލްވާން ފަށާނެއެވެ. (ބައިވެރިއަކު ނެތްނަމަ ނަންބަރު ރޯލް ނުކޮށް 'ބައިވެރިއަކު ނެތް' ކަމަށް ދައްކާނެއެވެ).</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-purple-400 shrink-0">4. ނަސީބުވެރިޔާ ހާމަކުރާ ގަޑި:</span>
                <span>ނަންބަރު ރޯލްވުން ހުއްޓި، ނަސީބުވެރިޔާ އޮޓޯއިން ހޮވި އިޢުލާން ކުރެވޭނެއެވެ.</span>
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setQuestionModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-400"
            >
              Save Question
            </button>
          </div>
        </form>
      </Modal>

      {/* Create / Edit Prize Modal */}
      <Modal
        isOpen={prizeModalOpen}
        onClose={() => setPrizeModalOpen(false)}
        title={editingPrize ? 'އިނާމު އިޞްލާޙުކުރައްވާ' : 'އަލަށް އިނާމެއް އިތުރުކުރައްވާ'}
      >
        <form onSubmit={handleSavePrize} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Prize Title *</label>
            <input
              type="text"
              required
              value={prizeFormTitle}
              onChange={e => setPrizeFormTitle(e.target.value)}
              placeholder="e.g., iPhone 15 Pro / 5000 MVR Cash Prize"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Description</label>
            <textarea
              rows={2}
              value={prizeFormDescription}
              onChange={e => setPrizeFormDescription(e.target.value)}
              placeholder="Detailed description of the prize..."
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Sponsor Name</label>
              <input
                type="text"
                value={prizeFormSponsorName}
                onChange={e => setPrizeFormSponsorName(e.target.value)}
                placeholder="e.g., Dhiraagu / Ooredoo"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Value Amount (MVR / Est.)</label>
              <input
                type="text"
                value={prizeFormValueAmount}
                onChange={e => setPrizeFormValueAmount(e.target.value)}
                placeholder="e.g., MVR 5,000"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          <ImageUploadInput
            label="Prize Image"
            value={prizeFormImage}
            onChange={setPrizeFormImage}
            placeholder="Upload or select prize photo..."
          />

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Status</label>
            <select
              value={prizeFormStatus}
              onChange={e => setPrizeFormStatus(e.target.value as 'active' | 'inactive')}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setPrizeModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Save Prize
            </button>
          </div>
        </form>
      </Modal>

      {/* Create / Edit Sponsor Modal */}
      <Modal
        isOpen={sponsorModalOpen}
        onClose={() => setSponsorModalOpen(false)}
        title={editingSponsor ? 'ސްޕޮންސަރ އިޞްލާޙުކުރައްވާ' : 'އަލަށް ސްޕޮންސަރެއް އިތުރުކުރައްވާ'}
      >
        <form onSubmit={handleSaveSponsor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Sponsor Name *</label>
            <input
              type="text"
              required
              value={sponsorFormName}
              onChange={e => setSponsorFormName(e.target.value)}
              placeholder="e.g., Allied Insurance Company"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ImageUploadInput
              label="Sponsor Logo"
              value={sponsorFormLogo}
              onChange={setSponsorFormLogo}
            />

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Website / Link URL</label>
              <input
                type="text"
                value={sponsorFormWebsiteUrl}
                onChange={e => setSponsorFormWebsiteUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Ad / Promotional Text</label>
            <input
              type="text"
              value={sponsorFormAdText}
              onChange={e => setSponsorFormAdText(e.target.value)}
              placeholder="e.g., Main Digital Partner of Ramazan Quiz 2026"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          <ImageUploadInput
            label="Special Product / Promo Image"
            value={sponsorFormProductImage}
            onChange={setSponsorFormProductImage}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Display Order</label>
              <input
                type="number"
                min={1}
                value={sponsorFormDisplayOrder}
                onChange={e => setSponsorFormDisplayOrder(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Status</label>
              <select
                value={sponsorFormStatus}
                onChange={e => setSponsorFormStatus(e.target.value as 'active' | 'inactive')}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setSponsorModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
            >
              Save Sponsor
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Contact Status Update */}
      <Modal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        title="Update Winner Contact Status"
        description="Write the participant's full name to confirm contact status."
      >
        <form onSubmit={handleSaveContactStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
              Participant Full Name <span className="text-rose-400">*</span>
            </label>
            <p className="text-[11px] text-slate-400 mb-1.5">
              To change contact status, you must type the name of the participant for verification.
            </p>
            <input
              type="text"
              required
              value={contactNameInput}
              onChange={e => setContactNameInput(e.target.value)}
              placeholder="Enter full name of participant..."
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Contact Status</label>
            <select
              value={contactStatusSelect}
              onChange={e => setContactStatusSelect(e.target.value as any)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            >
              <option value="contacted">Contacted (ގުޅުނު)</option>
              <option value="not_contacted">Not Contacted (ނުގުޅޭ)</option>
              <option value="unreachable">Unreachable (ގުޅޭގޮތް ނުވި)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setContactModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs"
            >
              Save Contact Status
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Prize Collection & Payment Slip Upload */}
      <Modal
        isOpen={winnerPrizeModalOpen}
        onClose={() => setWinnerPrizeModalOpen(false)}
        title="Update Prize Collection Status"
        description="Upload a payment slip or receipt to mark prize as collected."
      >
        <form onSubmit={handleSavePrizeStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Prize Status</label>
            <select
              value={prizeStatusSelect}
              onChange={e => setPrizeStatusSelect(e.target.value as any)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            >
              <option value="collected">Collected (ހަވާލުކުރެވިއްޖެ)</option>
              <option value="pending">Pending (ހަވާލުނުކުރެވޭ)</option>
              <option value="forfeited">Forfeited (ބާޠިލުކުރެވިއްޖެ)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
              Payment Slip / Collection Proof Receipt {prizeStatusSelect === 'collected' && <span className="text-rose-400">*</span>}
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Upload an image or document file (PNG, JPG, PDF) as proof of payment/delivery.
            </p>

            <div className="space-y-3">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-orange-400 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>

            {paymentSlipPreview && (
              <div className="mt-3 p-2 bg-slate-950 border border-slate-800 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Payment Slip Preview:</p>
                <img src={paymentSlipPreview} alt="Slip preview" className="max-h-40 rounded-lg object-contain mx-auto" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setWinnerPrizeModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
            >
              Save Prize Status
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: View Payment Slip Preview */}
      <Modal
        isOpen={viewSlipModalOpen}
        onClose={() => setViewSlipModalOpen(false)}
        title="Payment Slip / Collection Proof"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center">
            <img src={selectedSlipUrl} alt="Payment slip" className="max-h-96 rounded-xl object-contain" />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setViewSlipModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-white font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Mark Not Eligible / Disqualify Confirmation with Reason */}
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

      {/* CONFIRM MODAL: Delete Quiz Question */}
      <ConfirmModal
        isOpen={!!questionToDelete}
        onClose={() => setQuestionToDelete(null)}
        onConfirm={handleConfirmDeleteQuestion}
        title="ސުވާލު ޑިލީޓް ކުރުން (Delete Quiz Question)"
        message={`ކުއިޒް ސުވާލު "Day ${questionToDelete?.questionNumber}: ${questionToDelete?.title || ''}" ސިސްޓަމުން ފޮހެލަން ކަށަވަރު ކުރައްވާ. މިއާއެކު މި ސުވާލަށް ލިބިފައިވާ ހުރިހާ ޖަވާބުތަކާއި ނަސީބުވެރިޔާގެ ރެކޯޑު ފޮހެވޭނެއެވެ.`}
        confirmText="ސުވާލު ފޮހެލާ (Delete Question)"
        cancelText="ކެންސަލް (Cancel)"
        isDanger={true}
      />

      {/* CONFIRM MODAL: Delete Quiz Prize */}
      <ConfirmModal
        isOpen={!!prizeToDelete}
        onClose={() => setPrizeToDelete(null)}
        onConfirm={handleConfirmDeletePrize}
        title="އިނާމު ޑިލީޓް ކުރުން (Delete Quiz Prize)"
        message={`އިނާމު "${prizeToDelete?.title || ''}" ސިސްޓަމުން ފޮހެލަން ކަށަވަރު ކުރައްވާ.`}
        confirmText="އިނާމު ފޮހެލާ (Delete Prize)"
        cancelText="ކެންސަލް (Cancel)"
        isDanger={true}
      />

      {/* CONFIRM MODAL: Delete Quiz Sponsor */}
      <ConfirmModal
        isOpen={!!sponsorToDelete}
        onClose={() => setSponsorToDelete(null)}
        onConfirm={handleConfirmDeleteSponsor}
        title="ސްޕޮންސަރު ޑިލީޓް ކުރުން (Delete Sponsor)"
        message={`ސްޕޮންސަރު "${sponsorToDelete?.name || ''}" ސިސްޓަމުން ފޮހެލަން ކަށަވަރު ކުރައްވާ.`}
        confirmText="ސްޕޮންސަރު ފޮހެލާ (Delete Sponsor)"
        cancelText="ކެންސަލް (Cancel)"
        isDanger={true}
      />

      {/* CONFIRM MODAL: Delete Quiz Submission / Participant */}
      <ConfirmModal
        isOpen={!!submissionToDelete}
        onClose={() => setSubmissionToDelete(null)}
        onConfirm={handleDeleteSubmission}
        title="ބައިވެރިޔާގެ ޖަވާބު ފޮހެލުން (Delete Quiz Submission)"
        message={`ބައިވެރިޔާ #${submissionToDelete?.participantNumber} (ID: ${submissionToDelete?.normalizedIdNumber || submissionToDelete?.idNumber || submissionToDelete?.maskedIdNumber}) ގެ ޖަވާބު ސިސްޓަމުން ދާއިމީކޮށް ފޮހެލަން ކަށަވަރު ކުރައްވާ.`}
        confirmText="ޖަވާބު ފޮހެލާ (Delete Submission)"
        cancelText="ކެންސަލް (Cancel)"
        isDanger={true}
      />

      {/* CONFIRM MODAL: Delete Master Participant */}
      <ConfirmModal
        isOpen={!!masterParticipantToDelete}
        onClose={() => setMasterParticipantToDelete(null)}
        onConfirm={handleDeleteMasterParticipant}
        title="ބައިވެރިޔާ މާސްޓަރ ލިސްޓުން ފޮހެލުން (Delete Master Participant)"
        message={`ބައިވެރިޔާ (ID: ${masterParticipantToDelete?.normalizedIdNumber || masterParticipantToDelete?.idNumber || 'N/A'}) ގެ އެންމެހައި ޖަވާބުތަކާއި ރެކޯޑު ސިސްޓަމުން ދާއިމީކޮށް ފޮހެލަން ކަށަވަރު ކުރައްވާ. މިއާއެކު މި ބައިވެރިޔާ ހުރިހާ ސުވާލަކުން އުނިވާނެއެވެ.`}
        confirmText="ބައިވެރިޔާ ފޮހެލާ (Delete Participant)"
        cancelText="ކެންސަލް (Cancel)"
        isDanger={true}
      />

      {/* CONFIRM MODAL: Delete Quiz Winner */}
      <ConfirmModal
        isOpen={!!winnerToDelete}
        onClose={() => setWinnerToDelete(null)}
        onConfirm={handleDeleteWinner}
        title="ނަސީބުވެރިޔާގެ ރެކޯޑު ފޮހެލުން (Delete Winner Record)"
        message={`ސުވާލު Day ${winnerToDelete?.questionNumber || 'Quiz'} ގެ ނަސީބުވެރިޔާ #${winnerToDelete?.participantNumber} ގެ ރެކޯޑު ފޮހެލަން ކަށަވަރު ކުރައްވާ. މިއާއެކު މި ސުވާލަށް އައު ނަސީބުވެރިއަކު ހޮވުމުގެ ފުރުސަތު ހުޅުވިގެންދާނެއެވެ.`}
        confirmText="ރެކޯޑު ފޮހެލާ (Delete Winner)"
        cancelText="ކެންސަލް (Cancel)"
        isDanger={true}
      />

    </PortalLayout>
  );
};
