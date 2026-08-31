import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { BookOpen, CheckCircle, Clock, ShieldCheck, HelpCircle, Trophy, Send, Sparkles, Calendar, Award, Building2, ArrowRight, RotateCcw, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { useTableSync } from '../../hooks/useRealtimeSync';
import { RollingContactNumbers } from './RollingContactNumbers';
import { formatDateTime, formatDate, getThaanaOptionLabel, setSystemTimezone } from '../../utils/formatters';

export const QuizSection: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);

  // Form State
  const [idNumber, setIdNumber] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any>(null);

  // Live Timer State for Deadline
  const [timerText, setTimerText] = useState<string>('--:--:--');
  // Live Timer State for Next Question
  const [nextQuestionTimer, setNextQuestionTimer] = useState<string>('--:--:--');

  // Rolling Lucky Draw Eligible Data & Timing
  const [eligibleNumbers, setEligibleNumbers] = useState<string[]>([]);
  const [participantContacts, setParticipantContacts] = useState<{ participantNumber: string; contactNumber: string }[]>([]);
  const [rollingDurationSeconds, setRollingDurationSeconds] = useState<number>(10);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showAllWinnersModal, setShowAllWinnersModal] = useState<boolean>(false);
  const [allWinnersResults, setAllWinnersResults] = useState<any[]>([]);
  const [loadingWinners, setLoadingWinners] = useState<boolean>(false);
  const [lastDrawnWinner, setLastDrawnWinner] = useState<{ participantNumber: string; contactNumber?: string } | null>(null);

  const fetchAllWinners = async () => {
    setLoadingWinners(true);
    try {
      const res = await api.getQuizResultsHistory();
      setAllWinnersResults(res?.results || []);
    } catch (err) {
      console.error('Error fetching quiz winners:', err);
    } finally {
      setLoadingWinners(false);
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => {
        confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } });
      }, 300);
    } catch (e) {
      console.warn('Confetti unavailable:', e);
    }
  };

  const fetchQuiz = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.getCurrentQuiz();
      setQuizData(res);

      if (res?.timezone) {
        setSystemTimezone(res.timezone);
      }

      if (typeof res?.serverTimeEpoch === 'number') {
        const offset = res.serverTimeEpoch - Date.now();
        setServerOffsetMs(offset);
      }

      if (res?.question?.rollingDurationSeconds) {
        setRollingDurationSeconds(res.question.rollingDurationSeconds);
      }

      if (res?.question?.id && (res.question.correctOptionId || ['answer_revealed', 'draw_scheduled', 'draw_running', 'winner_announced', 'completed'].includes(res.state))) {
        const eligibleRes = await api.getEligibleNumbers(res.question.id);
        setEligibleNumbers(eligibleRes.participantNumbers || []);
        setParticipantContacts(eligibleRes.participantContacts || []);
        if (eligibleRes.rollingDurationSeconds) {
          setRollingDurationSeconds(eligibleRes.rollingDurationSeconds);
        }
      }
    } catch (err: any) {
      if (showLoading) {
        setError(err.message || 'ކުއިޒްގެ މަޢުލޫމާތު ހޯދުމުގައި މައްސަލައެއް ދިމާވެއްޖެ.');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz(true);

    // Silent background polling every 2 seconds for smooth state transitions
    const pollInterval = setInterval(() => {
      fetchQuiz(false);
    }, 2000);

    return () => clearInterval(pollInterval);
  }, []);

  // Instant real-time database sync for active quiz question, submissions, and winners
  useTableSync(['quiz_questions', 'quiz_submissions', 'quiz_winners', 'quiz_prizes', 'quizQuestions', 'quizSubmissions', 'quizWinners'], () => {
    fetchQuiz(false);
  });

  // When question switches to the newly published question, reset selection and submission states
  useEffect(() => {
    if (quizData?.question?.id) {
      setSelectedOptionId('');
      setSubmitSuccess(null);
      setError(null);
      setLastDrawnWinner(null);
      setShowWinnerOverlay(false);
    }
  }, [quizData?.question?.id]);

  // Countdown timer effect
  useEffect(() => {
    const isScheduledState = quizData?.state === 'scheduled' || (!quizData?.question && Boolean(quizData?.nextQuestion));
    const targetTimeIso = isScheduledState
      ? (quizData?.question?.publishAt || quizData?.nextQuestion?.publishAt)
      : quizData?.state === 'open'
        ? quizData?.question?.closeAt
        : quizData?.state === 'closed'
          ? (quizData?.question?.drawStartAt || quizData?.question?.revealAt)
          : quizData?.state === 'draw_running'
            ? (quizData?.question?.revealAt || quizData?.question?.drawStartAt)
            : (quizData?.question?.revealAt && !quizData?.question?.correctOptionId ? quizData.question.revealAt : null);

    if (!targetTimeIso) {
      setTimerText('00:00:00');
      return;
    }

    const updateTimer = () => {
      const deadline = new Date(targetTimeIso).getTime();
      const now = Date.now() + serverOffsetMs;
      const diff = deadline - now;

      if (diff <= 0) {
        setTimerText('00:00:00');
        fetchQuiz(false); // Refresh status smoothly without full page loading spinner when deadline passes
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');
      if (days > 0) {
        setTimerText(`${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      } else {
        setTimerText(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [quizData?.question?.publishAt, quizData?.nextQuestion?.publishAt, quizData?.question?.closeAt, quizData?.question?.revealAt, quizData?.question?.correctOptionId, quizData?.state, serverOffsetMs]);

  // Determine if a next question is created/scheduled
  const nextQuestion = quizData?.nextQuestion || (() => {
    if (!quizData?.allQuestions || !quizData?.question) return null;
    const nowMs = Date.now() + serverOffsetMs;
    const candidates = quizData.allQuestions
      .filter((q: any) => q.id !== quizData.question.id)
      .filter((q: any) => q.publishAt && new Date(q.publishAt).getTime() > nowMs)
      .sort((a: any, b: any) => {
        const timeA = new Date(a.publishAt).getTime();
        const timeB = new Date(b.publishAt).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return (a.questionNumber || 0) - (b.questionNumber || 0);
      });
    return candidates[0] || null;
  })();

  const isWinnerPicked = Boolean(quizData?.winner) || quizData?.state === 'winner_announced' || quizData?.state === 'completed' || Boolean(lastDrawnWinner);

  // Countdown timer for next question publishing
  useEffect(() => {
    if (!nextQuestion?.publishAt) {
      setNextQuestionTimer('00:00:00');
      return;
    }

    const updateNextTimer = () => {
      const publishTime = new Date(nextQuestion.publishAt).getTime();
      const now = Date.now() + serverOffsetMs;
      const diff = publishTime - now;

      if (diff <= 0) {
        setNextQuestionTimer('00:00:00');
        fetchQuiz(false);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');
      if (days > 0) {
        setNextQuestionTimer(`${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      } else {
        setNextQuestionTimer(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      }
    };

    updateNextTimer();
    const interval = setInterval(updateNextTimer, 1000);
    return () => clearInterval(interval);
  }, [nextQuestion?.publishAt, serverOffsetMs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOptionId) {
      setError('ސުވާލުގެ ޖަވާބެއް ޚިޔާރުކުރައްވާ (Please select an answer option).');
      return;
    }
    if (!idNumber || !idNumber.trim()) {
      setError('އައިޑީ ކާޑު ނަންބަރު ލިޔުއްވާ (Please enter your ID card number).');
      return;
    }
    if (!contactNumber || !contactNumber.trim()) {
      setError('ގުޅޭނެ ފޯނު ނަންބަރު ލިޔުއްވާ (Please enter your contact phone number).');
      return;
    }
    if (!consentAccepted) {
      setError('ކުއިޒުގެ ޤަވާއިދުތަކަށް އެއްބަސްވެ އިޤްރާރުގައި ފާހަގަޖައްސަވާ (Please accept the quiz terms and conditions).');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await api.submitQuiz({
        questionId: quizData.question.id,
        idNumber: idNumber.trim().toUpperCase(),
        contactNumber: contactNumber.trim(),
        selectedOptionId,
        consentAccepted
      });

      setSubmitSuccess(res);
      fetchQuiz(false); // Refresh stats without triggering full-screen loading spinner
    } catch (err: any) {
      setError(err.message || 'ޖަވާބު ފޮނުވުމުގައި މައްސަލައެއް ދިމާވެއްޖެ.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400">
        <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">ރަމަޟާން ކުއިޒް ލޯޑުވަނީ...</p>
      </div>
    );
  }

  if (!quizData || quizData.quizAvailable === false || (!quizData.question && !quizData.nextQuestion)) {
    return null;
  }

  const question = quizData.question || quizData.nextQuestion;
  const state = quizData.question ? quizData.state : 'scheduled';
  const { stats, winner, sponsors } = quizData;

  const hasZeroParticipants = (stats?.eligibleCount === 0 || participantContacts.length === 0) && (stats?.totalParticipants === 0 || stats?.eligibleCount === 0);

  const nowMs = Date.now() + serverOffsetMs;
  const drawTimeMs = question?.drawStartAt ? new Date(question.drawStartAt).getTime() : (question?.closeAt ? new Date(question.closeAt).getTime() : 0);
  const defaultRevealOffset = ((question?.rollingDurationSeconds || 10) * 1000);
  const revealTimeMs = question?.revealAt ? new Date(question.revealAt).getTime() : (drawTimeMs > 0 ? drawTimeMs + defaultRevealOffset : 0);
  const isWinnerDeclared = state === 'winner_announced' || state === 'completed' || Boolean(winner) || (revealTimeMs > 0 && nowMs >= revealTimeMs);

  const stateLabels: Record<string, string> = {
    open: 'ޖަވާބު ފޮނުވުމަށް ހުޅުވާލެވިފައި',
    closed: 'ޖަވާބު ފޮނުވުމުގެ ވަގުތު ހަމަވެއްޖެ',
    answer_revealed: 'ރަނގަޅު ޖަވާބު ހާމަކުރެވިއްޖެ',
    draw_running: 'ގުރާތު ނެގުން ކުރިއަށްދަނީ',
    winner_announced: 'ވަނަ ލިބުނު ފަރާތް ހާމަކުރެވިއްޖެ',
    completed: 'ނިމިފައި'
  };

  const formatDateTimeDhivehi = (isoStr?: string) => {
    if (!isoStr) return 'ކަނޑައެޅިފައެއް ނެތް';
    return formatDateTime(isoStr, false, 'ކަނޑައެޅިފައެއް ނެތް');
  };

  const formatDateDhivehi = (isoStr?: string) => {
    if (!isoStr) return '';
    return formatDate(isoStr, '');
  };

  return (
    <section id="quiz" className="py-16 bg-slate-950 text-white relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Banner */}
        <div className="text-center max-w-3xl mx-auto mb-8 flex flex-col items-center">
          <div
            style={{ minWidth: '220px', minHeight: '43.5875px' }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 font-bold text-base uppercase tracking-wider mb-2.5 max-w-full"
          >
            <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
            <span>{quizData?.quizHeaderTitle || 'ރަމަޟާން 1447 ދުވަހުގެ ކުއިޒް'}</span>
          </div>
          <p className="text-sm text-slate-300 mt-1 mb-3 max-w-2xl text-center leading-relaxed">
            {quizData?.quizHeaderDescription || 'މިއަދުގެ ސުވާލަށް ރަނގަޅު ޖަވާބު ދެއްވައިގެން ގުރާތުގައި ބައިވެރިވެ އަގުހުރި އިނާމު ހޯއްދަވާ!'}
          </p>
          <div className="flex items-center justify-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700/90 border border-slate-700/90 hover:border-amber-500/50 text-amber-300 hover:text-amber-200 font-semibold text-xs transition-all shadow-md hover:scale-105 active:scale-95"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>ކުއިޒުގެ ގަވާއިދު</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAllWinnersModal(true);
                fetchAllWinners();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 hover:text-amber-200 font-semibold text-xs transition-all shadow-md hover:scale-105 active:scale-95"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>ހޮވުނު ނަސީބުވެރިންގެ ލިސްޓު</span>
            </button>
          </div>
        </div>

        {/* Main Quiz Card (Question Board) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative">
          
          {/* Question Header Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4 border-b border-slate-800/80 pb-4">
            
            {/* RIGHT SIDE (Start in RTL): Question Number as Title */}
            <div className="flex flex-col items-start gap-1 justify-start">
              <h2 className="text-2xl sm:text-3xl font-black font-heading text-orange-400 tracking-tight">
                ސުވާލު {question.questionNumber}
              </h2>
              {question?.publishAt && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pl-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>ޝާއިޢުކުރާ / ކުރި ތާރީޚު: <strong className="text-slate-300 font-mono">{formatDateDhivehi(question.publishAt)}</strong></span>
                </div>
              )}
            </div>

            {/* CENTER: Countdown Timer on Question Board */}
            <div className="flex flex-col items-center justify-center gap-2">
              {state === 'scheduled' ? (
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-sky-950/90 border border-sky-500/50 text-sky-300 shadow-lg shadow-sky-500/10">
                  <Clock className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400/90 leading-none mb-0.5">
                      ޝާއިޢުކުރަން ބާކީ (Publishing In)
                    </span>
                    <span className="font-mono text-base font-extrabold text-white tracking-widest leading-none">
                      {timerText}
                    </span>
                  </div>
                </div>
              ) : state === 'open' ? (
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-orange-950/90 border border-orange-500/50 text-orange-300 shadow-lg shadow-orange-500/10">
                  <Clock className="w-4 h-4 text-orange-400 animate-pulse shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-400/90 leading-none mb-0.5">
                      ސުންގަޑިއަށް ބާކީ (Timer)
                    </span>
                    <span className="font-mono text-base font-extrabold text-white tracking-widest leading-none">
                      {timerText}
                    </span>
                  </div>
                </div>
              ) : state === 'closed' ? (
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-950/90 border border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/10">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400/90 leading-none mb-0.5">
                      ރޯލިންގ ފެށެން ބާކީ (Rolling In)
                    </span>
                    <span className="font-mono text-base font-extrabold text-white tracking-widest leading-none">
                      {timerText}
                    </span>
                  </div>
                </div>
              ) : state === 'draw_running' ? (
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-purple-950/90 border border-purple-500/50 text-purple-300 shadow-lg shadow-purple-500/10">
                  <Trophy className="w-4 h-4 text-purple-400 animate-bounce shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400/90 leading-none mb-0.5">
                      ނަސީބުވެރިޔާ ހާމަކުރަން ބާކީ (Reveal In)
                    </span>
                    <span className="font-mono text-base font-extrabold text-white tracking-widest leading-none">
                      {timerText}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-400 text-xs font-semibold">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>ސުންގަޑި ހަމަވެއްޖެ (Deadline Passed)</span>
                  </div>
                  {hasZeroParticipants ? (
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700/80 shadow-sm">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>ބައިވެރިން ނެތުމުން ނަސީބުވެރިއަކު ނުހޮވޭ (No participants for draw)</span>
                    </div>
                  ) : nowMs < drawTimeMs ? (
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/60 px-3 py-1 rounded-xl border border-amber-500/40 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>ނަންބަރު އެނބުރޭ ގަޑި: <strong className="font-mono font-bold text-amber-200">{formatDateTimeDhivehi(question.drawStartAt || question.closeAt)}</strong></span>
                    </div>
                  ) : !isWinnerDeclared && (revealTimeMs === 0 || nowMs < revealTimeMs) ? (
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-purple-300 bg-purple-950/60 px-3 py-1 rounded-xl border border-purple-500/40 shadow-sm">
                      <Trophy className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>ނަސީބުވެރިޔާ ހާމަކުރާ ގަޑި: <strong className="font-mono font-bold text-purple-200">{formatDateTimeDhivehi(question.revealAt || question.drawStartAt || question.closeAt)}</strong></span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-500/40 shadow-sm">
                      <Trophy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-extrabold text-emerald-200">ނަސީބުވެރިޔާ އިޢުލާން ކުރެވިއްޖެ!</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: Total Participants on Question Board */}
            <div className="flex items-center justify-start sm:justify-end">
              {stats?.totalParticipants !== undefined && (
                <span className="text-xs text-slate-300 bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-700/80 shrink-0">
                  ޖުމްލަ ބައިވެރިން: <strong className="text-orange-400 font-mono font-extrabold text-sm ml-1">{stats.totalParticipants}</strong>
                </span>
              )}
            </div>

          </div>



          {/* Question Display / Scheduled Notice */}
          {state === 'scheduled' ? (
            <div className="p-8 text-center bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3 my-4">
              <Clock className="w-10 h-10 text-orange-400 mx-auto animate-pulse" />
              <h3 className="text-lg font-bold text-white font-heading">
                ސުވާލު ޝާއިޢުކުރުން އިންތިޒާރުގައި (Question Pending Publish)
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                މި ސުވާލާއި ޚިޔާރުތައް ޝާއިޢުކުރެވޭނީ <strong className="text-orange-400 font-mono font-bold">{formatDateTimeDhivehi(question.publishAt)}</strong> ގައެވެ. ޝާއިޢުކުރާ ގަޑީގައި އޮޓޯއިން ސުވާލު ހުޅުވޭނެއެވެ!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl sm:text-2xl font-bold font-heading text-white leading-relaxed">
                {question.questionText}
              </h3>

              {/* Question Image (Shrink Fit) */}
              {(() => {
                const displayImg = question.questionImage || quizData?.defaultQuestionImage;
                const isVisible = (question.showQuestionImage !== false) && (quizData?.showQuestionImage !== false);
                if (!displayImg || !isVisible) return null;
                return (
                  <div className="rounded-2xl overflow-hidden max-h-80 sm:max-h-96 w-full border border-slate-800/80 bg-slate-950/90 flex items-center justify-center p-2 my-2 shadow-inner">
                    <img
                      src={displayImg}
                      alt="Question Illustration"
                      className="max-h-80 sm:max-h-96 w-auto max-w-full h-auto object-contain shrink rounded-xl shadow-md transition-all duration-300 hover:scale-[1.01]"
                    />
                  </div>
                );
              })()}
            </div>
          )}

          {/* Submission Form (When Quiz Open & Not Submitted yet) */}
          {state === 'open' && !submitSuccess && (
            <form onSubmit={handleSubmit} className="space-y-6 pt-4 border-t border-slate-800">
              
              {/* Options Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  ރަނގަޅު ޖަވާބު ޚިޔާރުކުރައްވާ: <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(question?.options || []).map((opt: any, idx: number) => {
                    const optLabel = getThaanaOptionLabel(opt.optionLabel, idx);
                    const isSelected = selectedOptionId === opt.id;
                    const optKey = opt.id || `quiz_opt_${optLabel}_${idx}`;
                    return (
                      <button
                        key={optKey}
                        id={`quiz_opt_${optLabel}`}
                        type="button"
                        onClick={() => setSelectedOptionId(opt.id)}
                        className={`flex items-start gap-3 p-4 rounded-2xl border text-right transition-all ${
                          isSelected
                            ? 'bg-orange-950/80 border-orange-500 text-white ring-2 ring-orange-500/20'
                            : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {optLabel}
                        </span>
                        <span className="text-sm font-medium leading-snug pt-0.5">{opt.optionText}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="quiz_id_number" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    އައިޑީ ކާޑު / ޕާސްޕޯޓް ނަންބަރު <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="quiz_id_number"
                    type="text"
                    required
                    value={idNumber}
                    onChange={e => setIdNumber(e.target.value.toUpperCase())}
                    placeholder="މިސާލު: A251345"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 uppercase tracking-wider"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">އިނާމު ހަވާލުކުރުމަށާއި، ތަކުރާރުކޮށް ޖަވާބު ފޮނުވުން ހުއްޓުވުމަށް ބޭނުންކުރެވެއެވެ.</span>
                </div>

                <div>
                  <label htmlFor="quiz_contact_number" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    ގުޅޭނެ ފޯނު ނަންބަރު <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="quiz_contact_number"
                    type="tel"
                    required
                    value={contactNumber}
                    onChange={e => setContactNumber(e.target.value)}
                    placeholder="މިސާލު: 7771234"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">ގުރާތުން ހޮވިއްޖެނަމަ ގުޅާނީ މި ނަންބަރަށެވެ.</span>
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-start gap-3 bg-slate-800/50 p-3.5 rounded-xl border border-slate-800">
                <input
                  id="quiz_consent"
                  type="checkbox"
                  required
                  checked={consentAccepted}
                  onChange={e => setConsentAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-700 text-orange-500 focus:ring-orange-500 bg-slate-900"
                />
                <label htmlFor="quiz_consent" className="text-xs text-slate-300 leading-relaxed">
                  އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ ރަމަޟާން ކުއިޒްގެ ޤަވާއިދުތަކަށް އެއްބަސްވަން. މިއީ ތެދު މަޢުލޫމާތުކަމާއި އެކަކަށްވުރެ ގިނަ ފަހަރު ޖަވާބު ފޮނުވާފައިނުވާނެކަމަށް އިޤްރާރުވަން.{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowRulesModal(true);
                    }}
                    className="text-amber-400 underline font-semibold hover:text-amber-300 ml-1 inline-block"
                  >
                    (ގަވާއިދު ބައްލަވާ)
                  </button>
                </label>
              </div>

              {error && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex flex-col items-center justify-center pt-2">
                <button
                  id="quiz_submit_btn"
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-10 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-base shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <span>ޖަވާބު ފޮނުވެނީ...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4 rotate-180" />
                      <span>ޖަވާބު ފޮނުއްވާ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Submission Success Box */}
          {submitSuccess && (
            <div className="bg-orange-950/80 border border-orange-500/40 p-6 rounded-2xl text-center space-y-4 animate-scale-in">
              <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center mx-auto font-bold">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-bold text-white font-heading">ޖަވާބު ކާމިޔާބުކަމާއެކު ފޮނުވިއްޖެ!</h4>
              <p className="text-orange-200 text-sm max-w-md mx-auto">
                {submitSuccess.message}
              </p>
              <div className="pt-2">
                <span className="text-xs uppercase tracking-wider text-orange-400 font-semibold block">
                  އާންމުކޮށް ފެންނާނެ ކިއު ނަންބަރު:
                </span>
                <span className="font-mono text-3xl font-bold text-white tracking-widest block mt-1">
                  {submitSuccess.participantNumber}
                </span>
              </div>
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitSuccess(null);
                    setSelectedOptionId('');
                    setIdNumber('');
                    setContactNumber('');
                    setConsentAccepted(false);
                    setError(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>އަނބުރާ ކުއިޒަށް (Back to Quiz)</span>
                </button>
              </div>
            </div>
          )}

          {/* Choice Options & Correct Answer Display Section */}
          {state !== 'open' && state !== 'scheduled' && Array.isArray(question?.options) && question.options.length > 0 && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                <h4 className="text-lg font-bold text-amber-400 font-heading flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-orange-400" />
                  <span>
                    {question.correctOptionId ? 'ރަނގަޅު ޖަވާބު ހާމަކުރުން' : 'ސުވާލުގެ ޚިޔާރުތައް (Choices)'}
                  </span>
                </h4>
                {!question.correctOptionId && question.revealAt && (
                  <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                    ރަނގަޅު ޖަވާބު ހާމަކުރެވޭނީ: <strong className="text-orange-400 font-mono">{formatDateTime(question.revealAt)}</strong>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {question.options.map((opt: any, idx: number) => {
                  const optLabel = getThaanaOptionLabel(opt.optionLabel, idx);
                  const isCorrect = question.correctOptionId && opt.id === question.correctOptionId;
                  const hasAnswerRevealed = Boolean(question.correctOptionId);
                  const choiceKey = opt.id || `quiz_choice_${optLabel}_${idx}`;
                  return (
                    <div
                      key={choiceKey}
                      className={`p-4 rounded-2xl border text-sm font-medium flex items-center gap-3 transition-all duration-500 ${
                        isCorrect
                          ? 'bg-gradient-to-r from-orange-950 via-amber-950/90 to-orange-950 border-2 border-orange-400 text-white ring-4 ring-orange-500/40 shadow-2xl shadow-orange-500/30 animate-pulse scale-[1.02]'
                          : hasAnswerRevealed
                          ? 'bg-slate-900/90 border-slate-800/90 text-slate-500 opacity-50'
                          : 'bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCorrect ? 'bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/50 ring-2 ring-amber-300/50' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {optLabel}
                      </span>
                      <span className={`text-base leading-snug ${isCorrect ? 'font-bold text-orange-100' : ''}`}>{opt.optionText}</span>
                      {isCorrect && (
                        <span className="mr-auto px-2.5 py-1 rounded-lg bg-orange-500 text-white text-xs font-black tracking-wide shadow-md flex items-center gap-1 shrink-0 animate-bounce">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>ރަނގަޅު ޖަވާބު</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {question.answerExplanation && question.correctOptionId && (
                <div className="p-5 bg-gradient-to-r from-slate-900 via-orange-950/30 to-slate-900 rounded-2xl border border-orange-500/30 text-xs sm:text-sm text-slate-200 leading-relaxed shadow-lg animate-scale-in space-y-1">
                  <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>ޖަވާބުގެ ތަފްޞީލު (Answer Explanation):</span>
                  </div>
                  <p className="text-slate-300 pt-1 leading-relaxed">{question.answerExplanation}</p>
                </div>
              )}

              {/* Rolling Participant Contact Numbers Display below answers */}
              {question.correctOptionId && (
                <RollingContactNumbers
                  contacts={participantContacts}
                  durationSeconds={rollingDurationSeconds}
                  drawStartAt={question.drawStartAt}
                  revealAt={question.revealAt}
                  serverOffsetMs={serverOffsetMs}
                  winnerContact={winner?.maskedContactNumber}
                  winnerParticipantNumber={winner?.participantNumber}
                  prizeTitle={winner?.prizeTitle || question.prizeTitle}
                  sponsorName={winner?.sponsorName || question.sponsorName}
                  isWinnerAnnounced={Boolean(winner)}
                  onWinnerSelected={(chosen, isLive) => {
                    setLastDrawnWinner(chosen);
                    fetchQuiz(false);
                    fetchAllWinners();
                    if (isLive) {
                      setShowWinnerOverlay(true);
                      triggerConfetti();
                    }
                  }}
                  onOpenWinnerOverlay={() => {
                    setShowWinnerOverlay(true);
                    triggerConfetti();
                  }}
                />
              )}
            </div>
          )}





          {/* OVERLAY OVER QUIZ BOARD: ANNOUNCE WINNER NUMBER AND PRIZE */}
          {showWinnerOverlay && (
            <div
              id="winner_announcement_overlay"
              className="fixed inset-0 z-50 p-3 sm:p-4 flex items-center justify-center overflow-hidden bg-transparent"
            >
              <div className="relative w-full max-w-lg bg-slate-950/40 backdrop-blur-md border-2 border-amber-500/80 rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4 animate-scale-in shadow-2xl my-auto max-h-[95vh] overflow-hidden">
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full blur-xl opacity-60 animate-pulse" />
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 text-white flex items-center justify-center mx-auto shadow-2xl shadow-orange-500/50 ring-2 ring-amber-400/30">
                    <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-white animate-bounce" />
                  </div>
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold uppercase tracking-widest shadow-lg">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>🎉 ރަމަޟާން ކުއިޒުގެ ނަސީބުވެރިޔާ 🎉</span>
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black font-heading text-white mt-2 leading-tight drop-shadow-md">
                    މަރުޙަބާ! ނަސީބުވެރި ފަރާތް!
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                    ސުވާލުގެ ރަނގަޅު ޖަވާބު ދެއްވި ބައިވެރިންގެ ތެރެއިން ގުރާތުން ހޮވުނު ނަސީބުވެރިޔާ
                  </p>
                </div>

                {/* Winner Details Card */}
                <div className="w-full bg-slate-900/90 border-2 border-orange-500/70 rounded-2xl p-4 shadow-2xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
                    <div className="text-center pt-1 sm:pt-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ކިއު ނަންބަރު (Queue No)</span>
                      <span
                        dir="ltr"
                        style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
                        className="text-2xl sm:text-3xl font-black font-mono text-orange-400 inline-block mt-0.5 tracking-widest tabular-nums drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                      >
                        {winner?.participantNumber || lastDrawnWinner?.participantNumber || participantContacts[0]?.participantNumber || 'RQ-0001'}
                      </span>
                    </div>
                    <div className="text-center pt-2 sm:pt-0 sm:pl-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ފޯނު ނަންބަރު (Phone No)</span>
                      <span
                        dir="ltr"
                        style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
                        className="text-2xl sm:text-3xl font-black font-mono text-amber-300 inline-block mt-0.5 tracking-widest tabular-nums drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                      >
                        {winner?.maskedContactNumber || lastDrawnWinner?.contactNumber || participantContacts[0]?.contactNumber || '77***12'}
                      </span>
                    </div>
                  </div>

                  {/* Prize & Sponsor Info */}
                  <div className="pt-2 border-t border-slate-800/80 text-center space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-amber-400 font-extrabold block">
                      ލިބުނު އިނާމު (Prize)
                    </span>
                    <h4 className="text-lg font-bold text-white font-heading">
                      {winner?.prizeTitle || question.prizeTitle || 'ކުއިޒް އިނާމު'}
                    </h4>
                    {(winner?.sponsorName || question.sponsorName) && (
                      <p className="text-[11px] text-slate-400">
                        ސްޕޮންސަރ: <strong className="text-amber-300">{winner?.sponsorName || question.sponsorName}</strong>
                      </p>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => triggerConfetti()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-xl shadow-amber-500/20 transition-all active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>އުފާފާޅުކުރައްވާ (Confetti)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowWinnerOverlay(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all border border-slate-700 hover:text-white flex items-center gap-2 shadow-lg"
                  >
                    <ArrowRight className="w-4 h-4 text-orange-400" />
                    <span>އަނބުރާ ކުއިޒަށް (Back to Quiz)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NEXT QUESTION PUBLISHING TIMER BANNER (Visible after winner is picked/announced) */}
          {isWinnerPicked && (
            <div id="next_question_publishing_banner" className="pt-6 border-t border-slate-800/80">
              {nextQuestion ? (
                <div className="bg-gradient-to-r from-slate-950 via-orange-950/40 to-slate-950 border-2 border-orange-500/60 rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right animate-scale-in">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold uppercase tracking-wider shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                      <span>ދެން އެންމެ އަވަހަށް އޮތް ސުވާލު (Next Question)</span>
                    </div>
                    <h4 className="text-lg font-bold text-white font-heading">
                      ސުވާލު {nextQuestion.questionNumber}{nextQuestion.questionText ? `: ${nextQuestion.questionText}` : ''}
                    </h4>
                    {nextQuestion.publishAt ? (
                      <p className="text-xs text-slate-300 flex items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>ޝާއިޢުކުރާ ގަޑި: <strong className="text-amber-300 font-mono font-bold">{formatDateTimeDhivehi(nextQuestion.publishAt)}</strong></span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 pt-0.5">
                        މި ސުވާލު އަވަސް މުއްދަތެއްގައި ޝާއިޢުކުރެވޭނެއެވެ.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-center sm:items-end gap-1 shrink-0 bg-slate-900/90 px-6 py-3.5 rounded-2xl border border-orange-500/50 shadow-inner">
                    <span className="text-[10px] uppercase font-extrabold text-orange-400 tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                      <span>ސުވާލު ޝާއިޢުކުރަން ބާކީ</span>
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300 tracking-widest drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                      {nextQuestionTimer}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-orange-400 animate-pulse" />
                    <span>ދެން އޮތް ސުވާލު އިންތިޒާރުގައި (Next Question Pending)</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    ކުރިއަށް އޮތް ސުވާލު ޝާއިޢުކުރާނެ ގަޑި އިޢުލާންކުރެވޭނެއެވެ.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* BOTTOM CENTER SPONSORS SECTION ON QUESTION BOARD */}
          {(question.sponsorName || (sponsors && sponsors.length > 0)) && (
            <div id="question_board_sponsors" className="pt-6 border-t border-slate-800/80 flex flex-col items-center justify-center text-center space-y-3.5">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>އިނާމު ސްޕޮންސަރުން (Sponsors)</span>
              </div>

              {/* All Official Quiz Sponsors Grid */}
              {sponsors && sponsors.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  {sponsors.map((s: any, sIdx: number) => (
                    <div key={s.id || s._id || `quiz_sponsor_${s.name || 'item'}_${sIdx}`} className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 px-3.5 py-2 rounded-xl transition-all shadow-md">
                      {s.logo ? (
                        <img src={s.logo} alt={s.name} className="h-5 max-w-[80px] object-contain" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-slate-200">{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Quiz Rules & Terms Overlay Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-heading">ކުއިޒުގެ ގަވާއިދުތައް</h3>
                  <p className="text-xs text-slate-400">ރަމަޟާން ކުއިޒުގައި ބައިވެރިވުމުގެ ޝަރުތުތަކާއި ގަވާއިދު</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 text-sm text-slate-200 leading-relaxed whitespace-pre-line space-y-3 font-sans max-h-[60vh] overflow-y-auto">
              {quizData?.quizTermsAndRules || '1. ކޮންމެ ބައިވެރިއަކަށްވެސް ދުވާލަކު ބައިވެރިވެވޭނީ 1 ފަހަރުއެވެ.\n2. ނަސީބުވެރިޔާ ހޮވޭނީ ރަނގަޅު ޖަވާބު ދެއްވާ ބައިވެރިންގެ ތެރެއިން ގުރާތުންނެވެ.\n3. ވަނަ ލިބޭ ފަރާތުގެ އައިޑީ ކާޑާއި ފޯނު ނަންބަރު ސައްޙަވާންޖެހޭނެއެވެ.'}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md hover:scale-105 active:scale-95"
              >
                ލައްޕާލައްވާ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Picked Winners Modal */}
      {showAllWinnersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-heading">ހޮވުނު ނަސީބުވެރިންގެ ލިސްޓު</h3>
                  <p className="text-xs text-slate-400">ކުއިޒްގެ ސުވާލުތަކުން ހޮވިފައިވާ ނަސީބުވެރިންގެ މަޢުލޫމާތު</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllWinnersModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
              {loadingWinners ? (
                <div className="text-center py-8 text-xs text-slate-400">ނަސީބުވެރިންގެ ލިސްޓު ހޯދަނީ...</div>
              ) : allWinnersResults.filter(r => r.winner).length === 0 ? (
                <div className="text-center py-10 bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 space-y-2">
                  <Trophy className="w-8 h-8 mx-auto text-slate-600 opacity-50" />
                  <p className="text-xs font-semibold">އަދި އެއްވެސް ސުވާލަކުން ނަސީބުވެރިއަކު ހޮވިފައެއް ނުވެއެވެ.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                        <th className="p-3 text-center">ސުވާލު ނަންބަރު</th>
                        <th className="p-3 text-center">ތާރީޚް</th>
                        <th className="p-3 text-center">ނަސީބުވެރިޔާގެ ކިއު ނަންބަރު</th>
                        <th className="p-3 text-center">ފޯނު ނަންބަރު</th>
                        <th className="p-3 text-center">އިނާމުގެ ޙާލަތު</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {allWinnersResults
                        .filter(r => r.winner)
                        .map((item, itemIdx) => (
                          <tr key={item.id || item.winner?.id || `winner_q${item.questionNumber}_${itemIdx}`} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 text-center font-bold text-amber-300">
                              ސުވާލު {item.questionNumber}
                            </td>
                            <td className="p-3 text-center text-slate-300 font-mono text-[11px]">
                              {formatDateDhivehi(item.winner?.selectedAt || item.publishAt || item.closeAt)}
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-emerald-400">
                              #{item.winner?.participantNumber}
                            </td>
                            <td className="p-3 text-center font-mono text-slate-200 dir-ltr" dir="ltr">
                              {item.winner?.maskedContactNumber || 'N/A'}
                            </td>
                            <td className="p-3 text-center">
                              {item.winner?.prizeCollectionStatus === 'collected' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 text-[10px] font-bold shadow-sm">
                                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                                  <span>ހަވާލުކުރެވިއްޖެ</span>
                                </span>
                              ) : item.winner?.prizeCollectionStatus === 'forfeited' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-700/80 text-[10px] font-bold shadow-sm">
                                  <span>ބާތިލް ކުރެވިފައި</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-700/80 text-[10px] font-bold shadow-sm">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>އިންތިޒާރުގައި</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAllWinnersModal(false)}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md hover:scale-105 active:scale-95"
              >
                ލައްޕާލައްވާ
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

