import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Play, Pause, Maximize2, Minimize2, Trophy, Volume2, VolumeX, Sparkles, Phone } from 'lucide-react';

interface RollingLuckyDrawProps {
  eligibleNumbers: string[];
  participantContacts?: { participantNumber: string; contactNumber: string }[];
  winnerNumber?: string;
  winnerContact?: string;
  durationSeconds?: number;
  prizeTitle?: string;
  sponsorName?: string;
  sponsorLogo?: string;
  onDrawComplete?: (winnerData?: { participantNumber: string; contactNumber?: string }) => void;
}

export const RollingLuckyDraw: React.FC<RollingLuckyDrawProps> = ({
  eligibleNumbers,
  participantContacts = [],
  winnerNumber,
  winnerContact,
  durationSeconds = 10,
  prizeTitle = 'Daily Quiz Winner Prize',
  sponsorName,
  sponsorLogo,
  onDrawComplete
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [displayedNumber, setDisplayedNumber] = useState<string>('RQ-????');
  const [displayedContact, setDisplayedContact] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(durationSeconds);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const hasAutoStartedRef = useRef(false);

  const safeEligible = eligibleNumbers.length > 0 ? eligibleNumbers : ['RQ-0001', 'RQ-0002', 'RQ-0003', 'RQ-0004'];

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 300);
    } catch (e) {
      console.warn('Confetti effect unavailable:', e);
    }
  };

  const startRolling = () => {
    setIsRunning(true);
    setIsCompleted(false);
    setTimeLeft(durationSeconds);

    if (intervalRef.current) clearTimeout(intervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    let speed = 50; // initial speed in ms
    let elapsed = 0;
    const totalMs = durationSeconds * 1000;

    const roll = () => {
      const randomIdx = Math.floor(Math.random() * safeEligible.length);
      const num = safeEligible[randomIdx];
      const match = participantContacts.find(c => c.participantNumber === num);
      const contactVal = match?.contactNumber || `7${(randomIdx * 7 + 1) % 9}***${10 + (randomIdx * 13) % 89}`;

      setDisplayedNumber(num);
      setDisplayedContact(contactVal);

      elapsed += speed;

      // Slow down in the final 3 seconds
      if (totalMs - elapsed < 3000) {
        speed += 25;
      }

      if (elapsed < totalMs) {
        intervalRef.current = setTimeout(roll, speed);
      } else {
        // Draw Finish - Auto Pick & Announce Winner
        const finalWinner = winnerNumber || safeEligible[Math.floor(Math.random() * safeEligible.length)];
        const matchContact = participantContacts.find(c => c.participantNumber === finalWinner);
        const finalContact = winnerContact || matchContact?.contactNumber || '77***89';

        setDisplayedNumber(finalWinner);
        setDisplayedContact(finalContact);
        setIsRunning(false);
        setIsCompleted(true);
        triggerConfetti();

        if (onDrawComplete) {
          onDrawComplete({ participantNumber: finalWinner, contactNumber: finalContact });
        }
      }
    };

    roll();

    // Countdown Timer Interval
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Auto-Start Rolling on Mount / Eligibility
  useEffect(() => {
    if (!hasAutoStartedRef.current && safeEligible.length > 0) {
      hasAutoStartedRef.current = true;
      startRolling();
    }
  }, [safeEligible.length, durationSeconds]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  return (
    <div
      ref={containerRef}
      id="rolling_draw_container"
      className={`relative rounded-3xl overflow-hidden transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-950 p-8 flex flex-col justify-between'
          : 'bg-gradient-to-br from-slate-900 via-slate-950 to-orange-950/40 border border-slate-800 p-6 sm:p-10 shadow-2xl'
      }`}
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-heading text-white">ވަގުތުން ގުރާތު ނެގުން</h3>
            <p className="text-xs text-slate-400">ޝަރުތުހަމަވާ ޖުމްލަ ބައިވެރިން: {safeEligible.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-orange-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Event Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Rolling Display Stage */}
      <div className="py-8 sm:py-12 flex flex-col items-center justify-center text-center space-y-6">
        
        {/* Timer Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-slate-200 text-sm font-mono font-medium shadow-md">
          <Sparkles className="w-4 h-4 text-orange-400 animate-spin" />
          <span>ސިކުންތު: <strong className="text-orange-400 font-bold">{timeLeft}</strong></span>
        </div>

        {/* Large Digit Slot Machine Display Box (Fully Visible) */}
        <div className="relative group w-full max-w-xl mx-auto">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-orange-500/25 via-amber-500/30 to-orange-500/25 blur-xl opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="relative bg-slate-900 border-2 border-orange-500/60 rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col items-center justify-center min-h-[140px] overflow-hidden">
            <div className="w-full text-center overflow-hidden px-2 flex items-center justify-center">
              <span className={`font-mono text-4xl sm:text-6xl md:text-7xl font-black tracking-wider text-orange-400 drop-shadow-[0_0_25px_rgba(249,115,22,0.5)] inline-block max-w-full text-center ${
                isRunning ? 'animate-pulse' : ''
              }`}>
                {displayedNumber}
              </span>
            </div>
            {displayedContact && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/90 border border-amber-600/70 text-xs sm:text-sm font-mono font-bold text-amber-300 shadow-lg tracking-wider">
                <Phone className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>{displayedContact}</span>
              </div>
            )}
          </div>
        </div>

        {/* Prize / Sponsor Information */}
        <div className="max-w-md bg-slate-900/60 rounded-2xl p-4 border border-slate-800 text-center">
          <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold block mb-1">
            ޚާއްޞަ އިނާމު
          </span>
          <p className="text-base font-bold text-white font-heading">{prizeTitle}</p>
          {sponsorName && (
            <p className="text-xs text-slate-400 mt-1">ސްޕޮންސަރ: {sponsorName}</p>
          )}
        </div>

        {/* Announcement Confirmation Card when complete */}
        {isCompleted && (
          <div className="bg-orange-950/80 border border-orange-500/50 rounded-2xl p-6 text-center max-w-lg animate-scale-in space-y-2 shadow-2xl">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500 text-white font-extrabold text-2xl mb-1 shadow-lg shadow-orange-500/40">
              🎉
            </div>
            <h4 className="text-2xl font-black text-white font-heading">މަރުޙަބާ! ނަސީބުވެރިޔާ ހޮވިއްޖެ!</h4>
            <p className="text-orange-200 text-sm">
              ނަސީބުވެރި ކިއު ނަންބަރު: <strong className="text-white font-mono text-base">{displayedNumber}</strong> {displayedContact && `(${displayedContact})`}
            </p>
            <p className="text-xs text-orange-300/80 pt-1">
              ވަނަ ލިބުނު ފަރާތުގެ މަޢުލޫމާތު ވަނީ ސިސްޓަމްގައި ރައްކާކުރެވިފައެވެ.
            </p>
            <div className="pt-3">
              <button
                type="button"
                onClick={startRolling}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs inline-flex items-center gap-2 transition-all"
              >
                <Play className="w-3.5 h-3.5 text-orange-400" />
                <span>އަލުން ގުރާތު ނެގުން (Re-roll Draw)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
