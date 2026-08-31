import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Phone, Sparkles, Eye, X, Users, Search, CheckCircle2, Clock, Trophy, Gift, Flag, AlertTriangle } from 'lucide-react';

export interface ContactItem {
  participantNumber: string;
  contactNumber: string;
  isEligible?: boolean;
  isDisqualified?: boolean;
  disqualificationReason?: string;
}

interface RollingContactNumbersProps {
  contacts: ContactItem[];
  durationSeconds?: number;
  drawStartAt?: string;
  revealAt?: string;
  winnerContact?: string;
  winnerParticipantNumber?: string;
  prizeTitle?: string;
  sponsorName?: string;
  isWinnerAnnounced?: boolean;
  onWinnerSelected?: (winnerItem: { participantNumber: string; contactNumber: string }, isLive?: boolean) => void;
  onOpenWinnerOverlay?: () => void;
  serverOffsetMs?: number;
}

export const RollingContactNumbers: React.FC<RollingContactNumbersProps> = ({
  contacts,
  durationSeconds = 10,
  drawStartAt,
  revealAt,
  winnerContact,
  winnerParticipantNumber,
  prizeTitle,
  sponsorName,
  isWinnerAnnounced = false,
  onWinnerSelected,
  onOpenWinnerOverlay,
  serverOffsetMs = 0
}) => {
  // Only include eligible participants for rolling rotation and winner draw
  const eligibleContacts = contacts.filter(c => c.isEligible !== false && !c.isDisqualified);
  const totalIneligibleCount = contacts.filter(c => c.isDisqualified || c.isEligible === false).length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  currentIndexRef.current = currentIndex;

  const [isRolling, setIsRolling] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(durationSeconds);
  const [showListModal, setShowListModal] = useState(false);
  const [showInlineList, setShowInlineList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'eligible' | 'not_eligible'>('all');
  const [finalWinner, setFinalWinner] = useState<ContactItem | null>(null);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#f97316', '#fbbf24', '#ef4444', '#10b981', '#3b82f6']
      });
    } catch (e) {
      // fallback
    }
  };

  const onWinnerSelectedRef = useRef(onWinnerSelected);
  onWinnerSelectedRef.current = onWinnerSelected;

  const hasPickedRef = useRef(false);
  const wasRollingActiveRef = useRef(false);

  // Helper to compute draw start and reveal target times in milliseconds
  const getDrawStartMs = (): number | null => {
    if (drawStartAt) {
      const d = new Date(drawStartAt).getTime();
      if (!isNaN(d)) return d;
    }
    return null;
  };

  const getTargetTimeMs = (): number | null => {
    if (revealAt) {
      const r = new Date(revealAt).getTime();
      if (!isNaN(r)) return r;
    }
    const ds = getDrawStartMs();
    if (ds !== null) {
      return ds + ((durationSeconds || 10) * 1000);
    }
    return null;
  };

  const drawStartMs = getDrawStartMs();
  const nowMs = Date.now() + serverOffsetMs;
  const hasRollingStarted = drawStartMs ? (nowMs >= drawStartMs) : true;
  const timeUntilDrawStart = drawStartMs ? Math.max(0, Math.ceil((drawStartMs - nowMs) / 1000)) : 0;

  // Determine predetermined target winner index from props if available
  const getTargetWinnerIndex = (): number => {
    if (eligibleContacts.length === 0) return 0;
    if (winnerParticipantNumber || winnerContact) {
      const idx = eligibleContacts.findIndex(c =>
        (winnerParticipantNumber && c.participantNumber === winnerParticipantNumber) ||
        (winnerContact && c.contactNumber === winnerContact)
      );
      if (idx !== -1) return idx;
    }
    return -1;
  };

  // Reset winner pick ref when target time or winner props change
  useEffect(() => {
    hasPickedRef.current = false;
    const targetIdx = getTargetWinnerIndex();
    if (targetIdx !== -1) {
      setCurrentIndex(targetIdx);
    }
    if (isWinnerAnnounced) {
      setIsRolling(false);
      setTimeLeft(0);
    }
  }, [drawStartAt, revealAt, winnerContact, winnerParticipantNumber, isWinnerAnnounced, eligibleContacts.length]);

  // Rolling index shuffle effect (shuffles real eligible contacts with deceleration towards target)
  useEffect(() => {
    if (!isRolling || eligibleContacts.length === 0) return;

    // Adjust shuffle speed: decelerate slightly in the final 2 seconds
    const intervalTime = timeLeft <= 1 ? 250 : timeLeft <= 2 ? 180 : 100;

    const interval = setInterval(() => {
      const targetIdx = getTargetWinnerIndex();
      if (timeLeft <= 1 && targetIdx !== -1) {
        // Steer directly into the predetermined target winner in final tick
        setCurrentIndex(targetIdx);
      } else {
        setCurrentIndex(prev => (prev + 1) % eligibleContacts.length);
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isRolling, eligibleContacts.length, timeLeft, winnerParticipantNumber, winnerContact]);

  // Countdown timer and automatic winner selection when announcement time is up
  useEffect(() => {
    if (isWinnerAnnounced || eligibleContacts.length === 0) {
      setIsRolling(false);
      setTimeLeft(0);
      const targetIdx = getTargetWinnerIndex();
      if (targetIdx !== -1) {
        setCurrentIndex(targetIdx);
      }
      return;
    }

    const checkAndCycle = () => {
      const now = Date.now() + serverOffsetMs;
      const ds = getDrawStartMs();

      // Before draw start time
      if (ds !== null && now < ds) {
        setIsRolling(false);
        setTimeLeft(Math.max(0, Math.ceil((ds - now) / 1000)));
        return;
      }

      const targetMs = getTargetTimeMs();
      if (targetMs !== null) {
        const diffSec = Math.max(0, Math.ceil((targetMs - now) / 1000));
        setTimeLeft(diffSec);

        if (diffSec > 0) {
          setIsRolling(true);
          wasRollingActiveRef.current = true;
        } else {
          // Announcement time is up! Stop rolling immediately
          setIsRolling(false);

          // Pick winner if not yet picked
          if (!hasPickedRef.current && eligibleContacts.length > 0) {
            hasPickedRef.current = true;
            const isLive = wasRollingActiveRef.current;
            const targetIdx = getTargetWinnerIndex();
            const finalIndex = targetIdx !== -1 ? targetIdx : currentIndexRef.current;
            setCurrentIndex(finalIndex);

            const selected = eligibleContacts[finalIndex] || eligibleContacts[0];
            const chosen: ContactItem = {
              participantNumber: selected.participantNumber,
              contactNumber: selected.contactNumber
            };
            setFinalWinner(chosen);
            if (isLive) {
              triggerConfetti();
            }
            if (onWinnerSelectedRef.current) {
              onWinnerSelectedRef.current(chosen, isLive);
            }
          }
        }
      } else {
        // Fallback for durationSeconds without drawStartAt/revealAt
        if (timeLeft > 0) {
          setIsRolling(true);
          wasRollingActiveRef.current = true;
        } else {
          setIsRolling(false);
          if (!hasPickedRef.current && eligibleContacts.length > 0) {
            hasPickedRef.current = true;
            const isLive = wasRollingActiveRef.current;
            const targetIdx = getTargetWinnerIndex();
            const finalIndex = targetIdx !== -1 ? targetIdx : currentIndexRef.current;
            setCurrentIndex(finalIndex);

            const selected = eligibleContacts[finalIndex] || eligibleContacts[0];
            const chosen: ContactItem = {
              participantNumber: selected.participantNumber,
              contactNumber: selected.contactNumber
            };
            setFinalWinner(chosen);
            if (isLive) {
              triggerConfetti();
            }
            if (onWinnerSelectedRef.current) {
              onWinnerSelectedRef.current(chosen, isLive);
            }
          }
        }
      }
    };

    checkAndCycle();
    const timer = setInterval(checkAndCycle, 500);
    return () => clearInterval(timer);
  }, [drawStartAt, revealAt, durationSeconds, isWinnerAnnounced, eligibleContacts, winnerContact, winnerParticipantNumber]);

  const formatTimeLeft = (seconds: number) => {
    if (seconds <= 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}h ${m < 10 ? '0' : ''}${m}m ${s < 10 ? '0' : ''}${s}s`;
    }
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // If there are no eligible participants at all, render the clean 'no participants' state
  if (eligibleContacts.length === 0) {
    return (
      <div id="no_participants_notice_box" className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-2 shadow-lg">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        </div>
        <h4 className="text-sm font-bold text-white font-heading">
          މި ސުވާލަށް ރަނގަޅު ޖަވާބު ދިން އެއްވެސް ބައިވެރިއަކު ނެތް
        </h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          No participants for this question / no correct entries recorded.
        </p>
      </div>
    );
  }

  const currentItem = eligibleContacts[currentIndex] || eligibleContacts[0];

  const displayWinnerNum = finalWinner?.participantNumber || winnerParticipantNumber || currentItem?.participantNumber || '';
  const displayWinnerPhone = finalWinner?.contactNumber || winnerContact || currentItem?.contactNumber || '';

  const displayContacts = contacts.length > 0 ? contacts : eligibleContacts;

  const filteredContacts = displayContacts.filter(c => {
    const matchesSearch =
      c.participantNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const isNotEligible = Boolean(c.isDisqualified || c.isEligible === false);

    if (filterType === 'eligible') return matchesSearch && !isNotEligible;
    if (filterType === 'not_eligible') return matchesSearch && isNotEligible;
    return matchesSearch;
  });

  const handleOpenBoard = () => {
    triggerConfetti();
    if (onOpenWinnerOverlay) {
      onOpenWinnerOverlay();
    }
  };

  const isAnnouncementDone = isWinnerAnnounced || Boolean(finalWinner) || (hasRollingStarted && timeLeft <= 0);

  return (
    <div id="rolling_contact_numbers_box" className="relative mt-4 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-orange-500/40 shadow-xl space-y-3 overflow-hidden">
      {/* Header Label & Timer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping shrink-0" />
          <span className="font-bold text-amber-400 font-heading flex items-center gap-1.5 leading-tight">
            <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>ރަނގަޅު ޖަވާބު ދިން ބައިވެރިންގެ ފޯނު ނަންބަރުތައް (Contact Numbers Rolling)</span>
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* List button visible when rolling starts */}
          {hasRollingStarted && (
            <button
              type="button"
              onClick={() => setShowListModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              <Eye className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>ލިސްޓު (View List)</span>
            </button>
          )}
          <span className="text-[11px] text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
            ޤާބިލު: <strong className="text-orange-400 font-mono">{eligibleContacts.length}</strong>
          </span>
          {totalIneligibleCount > 0 && (
            <span className="text-[11px] text-red-200 bg-red-950/80 px-2.5 py-0.5 rounded-full border border-red-500/60 font-semibold inline-flex items-center gap-1 animate-pulse">
              <Flag className="w-3 h-3 text-red-400 fill-red-500/40" />
              <span><strong>{totalIneligibleCount}</strong> ނުހިމެނޭ</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Rolling Display Reel */}
      <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-800 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
            <Phone className={`w-5 h-5 ${isRolling ? 'animate-bounce' : ''}`} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block truncate">
              {isAnnouncementDone ? 'ހޮވުނު ފޯނު ނަންބަރު (Winner Phone)' : 'ރޯލްވަމުންދާ ފޯނު ނަންބަރު (Rolling Phone)'}
            </span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span
                dir="ltr"
                style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
                className="font-mono text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-[0.12em] tabular-nums inline-block drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]"
              >
                {isRolling ? currentItem.contactNumber : displayWinnerPhone}
              </span>
              <span
                dir="ltr"
                style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
                className="text-xs font-mono font-bold text-amber-400/90 bg-amber-950/70 px-2.5 py-1 rounded-lg border border-amber-800/50 shrink-0 tracking-wider tabular-nums"
              >
                ({isRolling ? currentItem.participantNumber : displayWinnerNum})
              </span>
            </div>
          </div>
        </div>

        {/* Rolling Status & Timer Indicator / View Winner Board button */}
        <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto">
          {isRolling ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-orange-500/40 text-xs text-orange-300 font-bold shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping shrink-0" />
              <span>ރޯލް ވަނީ ({timeLeft}s)...</span>
            </div>
          ) : isAnnouncementDone ? (
            <button
              type="button"
              id="winner_board_show_btn"
              onClick={handleOpenBoard}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all ring-2 ring-amber-400/50 animate-pulse"
            >
              <Trophy className="w-4 h-4 text-slate-950 shrink-0" />
              <span>އިޢުލާން ބޯޑު (Winner Board Show)</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-400 font-semibold shadow-sm">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>އިންތިޒާރުގައި ({timeUntilDrawStart > 0 ? formatTimeLeft(timeUntilDrawStart) : `${timeLeft}s`})...</span>
            </div>
          )}
        </div>
      </div>

      {/* Inline Correct Answered Participant List */}
      {showInlineList && (
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="text-xs font-bold text-white font-heading">
                ރަނގަޅު ޖަވާބު ދިން ބައިވެރިންގެ ލިސްޓު (Correct Answer Participants)
              </span>
            </div>
            <span className="text-[11px] text-orange-400 font-mono font-bold bg-orange-950/60 px-2.5 py-0.5 rounded-full border border-orange-500/30">
              ޖުމްލަ: {eligibleContacts.length} ޤާބިލު
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
            {eligibleContacts.map((c, i) => (
              <div
                key={`inline_eligible_${c.participantNumber || 'p'}_${i}`}
                className={`p-2 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 ${
                  isRolling && currentItem.participantNumber === c.participantNumber
                    ? 'bg-orange-500/20 border-orange-500/60 text-amber-300 font-bold scale-[1.02] shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}
              >
                <span className="text-[10px] text-orange-400 font-bold">{c.participantNumber}</span>
                <span dir="ltr" className="text-slate-200">{c.contactNumber}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correct Answer Participant List Modal */}
      {showListModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    ރަނގަޅު ޖަވާބު ދިން ބައިވެރިންගේ ލިސްޓު
                  </h3>
                  <p className="text-xs text-slate-400">
                    Correct Answer Participants ({displayContacts.length} Total)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowListModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              {/* Filter Tabs & Search Bar */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all ${
                      filterType === 'all'
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ޖުމްލަ ({displayContacts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('eligible')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
                      filterType === 'eligible'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-emerald-400'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ޤާބިލު ({eligibleContacts.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('not_eligible')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
                      filterType === 'not_eligible'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-red-400'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5 fill-current" />
                    <span>ނުހިމެނޭ ({totalIneligibleCount})</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ހޯއްދަވާ (Search by Queue Number or Phone)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60"
                  />
                </div>
              </div>

              {/* Grid List */}
              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  އެއްވެސް ބައިވެރިއަކު ނުފެނުނު (No participants found)
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredContacts.map((item, idx) => {
                    const isNotEligible = Boolean(item.isDisqualified || item.isEligible === false);

                    if (isNotEligible) {
                      return (
                        <div
                          key={`modal_contact_ineligible_${item.participantNumber || 'p'}_${idx}`}
                          className="p-3 bg-gradient-to-r from-red-950/90 via-red-900/60 to-red-950/90 border-2 border-red-500/80 rounded-2xl flex items-center justify-between gap-3 shadow-lg shadow-red-950/50 ring-1 ring-red-500/40 relative overflow-hidden"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-red-900/80 border border-red-500/80 text-red-200 text-[10px] font-mono flex items-center justify-center shrink-0 font-bold">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-mono font-extrabold text-red-200 line-through decoration-red-400">
                                  {item.participantNumber}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-black uppercase flex items-center gap-1 shadow-sm shrink-0">
                                  <Flag className="w-2.5 h-2.5 fill-white" />
                                  <span>ނުހިމެނޭ (Not Eligible)</span>
                                </span>
                              </div>
                              {item.disqualificationReason && (
                                <span className="text-[10px] text-red-300/90 block truncate italic mt-0.5">
                                  {item.disqualificationReason}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-red-300/70 font-bold block uppercase tracking-wider">
                              ފޯނު
                            </span>
                            <span className="text-xs font-mono font-bold text-red-100">
                              {item.contactNumber}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`modal_contact_eligible_${item.participantNumber || 'p'}_${idx}`}
                        className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-mono flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono font-bold text-orange-400">
                                {item.participantNumber}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                <span>ޤާބިލު</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                            ފޯނު
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-200">
                            {item.contactNumber}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                ޖުމްލަ ފެންނަނީ: <strong className="text-orange-400 font-mono">{filteredContacts.length}</strong> / {displayContacts.length}
              </span>
              <button
                type="button"
                onClick={() => setShowListModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all"
              >
                ލައްޕަވާ (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
