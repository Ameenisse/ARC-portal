import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { Clock } from 'lucide-react';

interface ClockTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTime?: string; // "HH:mm"
  onSelectTime: (timeStr: string) => void;
  title?: string;
}

type PickerMode = 'hour' | 'minute';

const OUTER_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const INNER_HOURS = ['00', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'];
const MINUTES_STEP_5 = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export const ClockTimePickerModal: React.FC<ClockTimePickerModalProps> = ({
  isOpen,
  onClose,
  initialTime = '12:00',
  onSelectTime,
  title = 'Select Time'
}) => {
  const [selectedHour, setSelectedHour] = useState<number>(12);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [mode, setMode] = useState<PickerMode>('hour');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const dialRef = useRef<HTMLDivElement>(null);

  // Parse initial time when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode('hour');
      if (initialTime && /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(initialTime)) {
        const [h, m] = initialTime.split(':').map(Number);
        setSelectedHour(h);
        setSelectedMinute(m);
      } else {
        setSelectedHour(12);
        setSelectedMinute(0);
      }
    }
  }, [isOpen, initialTime]);

  // Convert hour & minute to strings
  const hourStr = String(selectedHour).padStart(2, '0');
  const minuteStr = String(selectedMinute).padStart(2, '0');

  // Calculate pointer angle & radius for clock hand
  const dialRadiusOuter = 92;
  const dialRadiusInner = 56;
  const cx = 130;
  const cy = 130;

  let handAngleDeg = 0;
  let handRadius = dialRadiusOuter;

  if (mode === 'hour') {
    // Determine inner ring vs outer ring
    const isInner = selectedHour === 0 || (selectedHour >= 13 && selectedHour <= 23);
    handRadius = isInner ? dialRadiusInner : dialRadiusOuter;

    // 12 o'clock -> 0 deg, 1 o'clock -> 30 deg, etc.
    const h12 = selectedHour % 12;
    handAngleDeg = h12 * 30;
  } else {
    // Minutes: 6 degrees per minute
    handAngleDeg = selectedMinute * 6;
    handRadius = dialRadiusOuter;
  }

  const handRad = ((handAngleDeg - 90) * Math.PI) / 180;
  const handX = cx + handRadius * Math.cos(handRad);
  const handY = cy + handRadius * Math.sin(handRad);

  // Math helper for dial pointer positioning
  const handlePointerSelect = (clientX: number, clientY: number, autoAdvance = false) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;

    if (mode === 'hour') {
      const isInner = dist < 74; // threshold between inner ring and outer ring
      let sector = Math.round(angleDeg / 30) % 12;

      let h = 0;
      if (isInner) {
        // Inner ring: index 0 is 00, 1 is 13, 2 is 14...
        h = sector === 0 ? 0 : 12 + sector;
      } else {
        // Outer ring: index 0 is 12, 1 is 1... 11 is 11
        h = sector === 0 ? 12 : sector;
      }
      setSelectedHour(h);
      if (autoAdvance) {
        setMode('minute');
      }
    } else {
      let m = Math.round(angleDeg / 6) % 60;
      setSelectedMinute(m);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    handlePointerSelect(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      handlePointerSelect(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      handlePointerSelect(e.clientX, e.clientY, true);
    }
  };

  const handleSet = () => {
    const finalTime = `${hourStr}:${minuteStr}`;
    onSelectTime(finalTime);
    onClose();
  };

  const handleClear = () => {
    setSelectedHour(0);
    setSelectedMinute(0);
    setMode('hour');
  };

  return (
    <Modal
      id="clock_time_picker_modal"
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="xs"
    >
      <div dir="ltr" className="flex flex-col items-center select-none space-y-3 sm:space-y-4 w-full">
        {/* TOP BANNER DISPLAY (Material Blue Header) */}
        <div dir="ltr" className="w-full bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 rounded-2xl p-3 sm:p-4 flex flex-row items-center justify-center gap-1 text-white shadow-inner">
          <button
            type="button"
            onClick={() => setMode('hour')}
            className={`text-4xl sm:text-5xl font-extrabold font-mono tracking-tight transition-all px-2 py-0.5 sm:py-1 rounded-xl ${
              mode === 'hour'
                ? 'bg-blue-600/50 text-white border border-blue-400/50 shadow-md scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {hourStr}
          </button>
          <span className="text-3xl sm:text-4xl font-bold text-slate-400 animate-pulse">:</span>
          <button
            type="button"
            onClick={() => setMode('minute')}
            className={`text-4xl sm:text-5xl font-extrabold font-mono tracking-tight transition-all px-2 py-0.5 sm:py-1 rounded-xl ${
              mode === 'minute'
                ? 'bg-blue-600/50 text-white border border-blue-400/50 shadow-md scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {minuteStr}
          </button>
        </div>

        {/* DIAL MODE INDICATOR */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900 p-1 rounded-full border border-slate-800 text-[11px] sm:text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('hour')}
            className={`px-3 sm:px-4 py-1 rounded-full transition-all ${
              mode === 'hour' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Select Hour
          </button>
          <button
            type="button"
            onClick={() => setMode('minute')}
            className={`px-3 sm:px-4 py-1 rounded-full transition-all ${
              mode === 'minute' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Select Minute
          </button>
        </div>

        {/* CIRCULAR DIAL FACE (Scaled Responsively for Small Screens) */}
        <div className="flex items-center justify-center w-full overflow-hidden py-1">
          <div
            ref={dialRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative w-[260px] h-[260px] scale-[0.88] xs:scale-95 sm:scale-100 origin-center shrink-0 rounded-full bg-slate-100 dark:bg-slate-200 text-slate-800 shadow-xl border-4 border-slate-300 dark:border-slate-300 cursor-pointer touch-none flex items-center justify-center my-1"
          >
          {/* SVG Clock Hand & Central Pivot */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {/* Hand Line */}
            <line
              x1={cx}
              y1={cy}
              x2={handX}
              y2={handY}
              stroke="#2563eb"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Center Pivot Dot */}
            <circle cx={cx} cy={cy} r="4" fill="#2563eb" />
            {/* Hand End Circle */}
            <circle cx={handX} cy={handY} r="18" fill="#2563eb" />
          </svg>

          {/* DIAL NUMBERS - HOUR MODE */}
          {mode === 'hour' && (
            <>
              {/* Outer Ring: 12, 1..11 */}
              {OUTER_HOURS.map((h, idx) => {
                const angleDeg = idx * 30;
                const rad = ((angleDeg - 90) * Math.PI) / 180;
                const x = cx + dialRadiusOuter * Math.cos(rad);
                const y = cy + dialRadiusOuter * Math.sin(rad);
                const isSelected = selectedHour === h;

                return (
                  <button
                    key={`outer-${h}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHour(h);
                      setMode('minute');
                    }}
                    style={{ left: `${x}px`, top: `${y}px` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm z-20 transition-transform ${
                      isSelected
                        ? 'text-white scale-110'
                        : 'text-slate-800 hover:text-blue-700'
                    }`}
                  >
                    {h}
                  </button>
                );
              })}

              {/* Inner Ring: 00, 13..23 */}
              {INNER_HOURS.map((hStr, idx) => {
                const hNum = Number(hStr);
                const angleDeg = idx * 30;
                const rad = ((angleDeg - 90) * Math.PI) / 180;
                const x = cx + dialRadiusInner * Math.cos(rad);
                const y = cy + dialRadiusInner * Math.sin(rad);
                const isSelected = selectedHour === hNum;

                return (
                  <button
                    key={`inner-${hStr}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHour(hNum);
                      setMode('minute');
                    }}
                    style={{ left: `${x}px`, top: `${y}px` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs z-20 transition-transform ${
                      isSelected
                        ? 'text-white scale-110'
                        : 'text-slate-600 hover:text-blue-800'
                    }`}
                  >
                    {hStr}
                  </button>
                );
              })}
            </>
          )}

          {/* DIAL NUMBERS - MINUTE MODE */}
          {mode === 'minute' && (
            <>
              {MINUTES_STEP_5.map((mStr, idx) => {
                const mNum = Number(mStr);
                const angleDeg = idx * 30;
                const rad = ((angleDeg - 90) * Math.PI) / 180;
                const x = cx + dialRadiusOuter * Math.cos(rad);
                const y = cy + dialRadiusOuter * Math.sin(rad);
                const isSelected = selectedMinute === mNum;

                return (
                  <button
                    key={`min-${mStr}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMinute(mNum);
                    }}
                    style={{ left: `${x}px`, top: `${y}px` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs z-20 transition-transform ${
                      isSelected
                        ? 'text-white scale-110'
                        : 'text-slate-800 hover:text-blue-700'
                    }`}
                  >
                    {mStr}
                  </button>
                );
              })}
            </>
          )}
        </div>
        </div>

        {/* BOTTOM ACTIONS (CLEAR, CANCEL, SET) */}
        <div className="w-full flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors"
          >
            CLEAR
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wider transition-colors"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleSet}
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-900/40 transition-all"
            >
              SET
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
