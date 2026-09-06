import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Navigation, MapPin, Compass, Loader2, RotateCw, CheckCircle2 } from 'lucide-react';
import {
  computePrayerSchedule,
  DEFAULT_COORDINATES,
  PrayerSchedule,
  PrayerTimeItem
} from '../../utils/prayerTimes';

export const MosqueIllustration: React.FC<{ className?: string }> = ({ className = 'w-12 h-10' }) => (
  <svg
    viewBox="0 0 110 85"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      {/* Minaret roof gradient */}
      <linearGradient id="minaretRoofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#DF7B5C" />
        <stop offset="100%" stopColor="#BA5437" />
      </linearGradient>

      {/* Minaret tower gradient */}
      <linearGradient id="towerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFF4E0" />
        <stop offset="45%" stopColor="#F4E2C7" />
        <stop offset="100%" stopColor="#D9BEA0" />
      </linearGradient>

      {/* Dome radial gradient - rich warm terracotta to gold */}
      <radialGradient id="domeGrad" cx="42%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#FFDEB5" />
        <stop offset="35%" stopColor="#EE9B63" />
        <stop offset="75%" stopColor="#C4622B" />
        <stop offset="100%" stopColor="#8A3E16" />
      </radialGradient>

      {/* Wall gradient */}
      <linearGradient id="wallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFBF5" />
        <stop offset="100%" stopColor="#EFE3D3" />
      </linearGradient>

      {/* Dome rim trim */}
      <linearGradient id="trimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#C87847" />
        <stop offset="100%" stopColor="#9C4C20" />
      </linearGradient>

      {/* Archway shadow */}
      <linearGradient id="archGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#573622" />
        <stop offset="100%" stopColor="#3B2112" />
      </linearGradient>
    </defs>

    {/* MINARET ON THE LEFT */}
    {/* Spire tip & finial */}
    <line x1="20" y1="12" x2="20" y2="6" stroke="#BA5437" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="20" cy="6" r="1.2" fill="#FFDEB5" />

    {/* Minaret cone roof */}
    <polygon points="20,12 14,24 26,24" fill="url(#minaretRoofGrad)" />

    {/* Balcony 1 */}
    <rect x="13" y="24" width="14" height="3" rx="1.5" fill="#D9BEA0" />

    {/* Upper shaft */}
    <rect x="15" y="27" width="10" height="13" fill="url(#towerGrad)" />

    {/* Balcony 2 */}
    <rect x="12" y="40" width="16" height="4" rx="2" fill="#BA5437" />

    {/* Lower shaft */}
    <rect x="14" y="44" width="12" height="28" fill="url(#towerGrad)" />

    {/* Shaft detail grooves */}
    <line x1="18" y1="48" x2="18" y2="68" stroke="#D0B596" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    <line x1="22" y1="48" x2="22" y2="68" stroke="#D0B596" strokeWidth="1" strokeLinecap="round" opacity="0.6" />

    {/* Minaret base */}
    <rect x="12" y="72" width="16" height="6" rx="1.5" fill="#C2A482" />

    {/* MOSQUE MAIN BUILDING ON THE RIGHT */}
    {/* Dome Finial */}
    <line x1="72" y1="19" x2="72" y2="13" stroke="#EE9B63" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="72" cy="13" r="1.5" fill="#FFDEB5" />

    {/* Onion Dome */}
    <path
      d="M72 19 C67 24, 46 29, 46 44 C46 47, 98 47, 98 44 C98 29, 77 24, 72 19 Z"
      fill="url(#domeGrad)"
    />

    {/* Dome Trim Ring */}
    <rect x="44" y="44" width="56" height="5" rx="2" fill="url(#trimGrad)" />

    {/* Main Wall */}
    <rect x="46" y="49" width="52" height="27" fill="url(#wallGrad)" />

    {/* Central Arch Door */}
    <path
      d="M66 76 L66 59 C66 53 78 53 78 59 L78 76 Z"
      fill="url(#archGrad)"
    />

    {/* Left Arch Door */}
    <path
      d="M51 76 L51 63 C51 59 60 59 60 63 L60 76 Z"
      fill="url(#archGrad)"
    />

    {/* Right Arch Door */}
    <path
      d="M84 76 L84 63 C84 59 93 59 93 63 L93 76 Z"
      fill="url(#archGrad)"
    />

    {/* Ground Plinth */}
    <rect x="8" y="76" width="96" height="4" rx="2" fill="#D9BEA0" />
  </svg>
);

export const PrayerTimeWidget: React.FC<{ className?: string; inNavbar?: boolean }> = ({ className = '', inNavbar = false }) => {
  const [schedule, setSchedule] = useState<PrayerSchedule>(() =>
    computePrayerSchedule(
      DEFAULT_COORDINATES.latitude,
      DEFAULT_COORDINATES.longitude,
      new Date(),
      false,
      DEFAULT_COORDINATES.locationName
    )
  );
  const [locationStatus, setLocationStatus] = useState<'detecting' | 'auto' | 'default' | 'denied'>('detecting');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const coordsRef = useRef<{ lat: number; lng: number }>({
    lat: DEFAULT_COORDINATES.latitude,
    lng: DEFAULT_COORDINATES.longitude
  });
  const isAutoRef = useRef<boolean>(false);

  // Re-calculate for current coordinates & today's exact date/time
  const refreshTimes = useCallback(() => {
    const today = new Date();
    setSchedule((prev) => {
      return computePrayerSchedule(
        coordsRef.current.lat,
        coordsRef.current.lng,
        today,
        isAutoRef.current,
        prev.locationName
      );
    });
  }, []);

  // Detect auto device location using navigator.geolocation
  const detectDeviceLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationStatus('default');
      return;
    }

    setDetectingLocation(true);
    setLocationStatus('detecting');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        coordsRef.current = { lat: latitude, lng: longitude };
        isAutoRef.current = true;

        const updated = computePrayerSchedule(latitude, longitude, new Date(), true);
        setSchedule(updated);
        setLocationStatus('auto');
        setDetectingLocation(false);
      },
      (error) => {
        console.warn('Auto device geolocation notice:', error.message);
        setLocationStatus(error.code === 1 ? 'denied' : 'default');
        setDetectingLocation(false);
        // Refresh with default Maldives coordinates
        refreshTimes();
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000 // cache for 5 mins
      }
    );
  }, [refreshTimes]);

  // Initial detection & periodic update
  useEffect(() => {
    detectDeviceLocation();

    // Recalculate every 30 seconds so next-prayer highlighting and midnight dates stay current
    const interval = setInterval(refreshTimes, 30000);
    return () => clearInterval(interval);
  }, [detectDeviceLocation, refreshTimes]);

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowFullSchedule(false);
      }
    };
    if (showFullSchedule) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFullSchedule]);

  const activePrayer = schedule.nextPrayer || schedule.prayers[2];

  return (
    <div className={`relative select-none ${className}`} ref={popoverRef}>
      {/* Compact Box matching uploaded design */}
      <button
        type="button"
        id="prayer_time_box"
        onClick={() => setShowFullSchedule((prev) => !prev)}
        className={`group relative flex items-center gap-1.5 sm:gap-2.5 px-2 py-1 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl border backdrop-blur-md transition-all duration-200 active:scale-[0.98] text-right ${
          inNavbar
            ? 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 hover:border-amber-500/50 text-white shadow-sm hover:shadow-amber-500/10'
            : 'bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-lg hover:shadow-xl hover:scale-[1.02]'
        }`}
        aria-label="ނަމާދު ވަގުތު ބައްލަވާލައްވާ"
        title={`ނަމާދު ވަގުތު - ${schedule.dateStr} (${schedule.locationName})`}
      >
        {/* Left Side: Prayer Name in Dhivehi & Prayer Time */}
        <div className="flex flex-col items-start justify-center min-w-[44px] sm:min-w-[65px]">
          {/* Dhivehi Prayer Name with optional subtle auto location badge */}
          <div className="flex items-center gap-1">
            <span
              dir="rtl"
              className={`font-medium text-[10px] sm:text-xs font-dhivehi leading-tight transition-colors ${
                inNavbar
                  ? 'text-slate-300 group-hover:text-amber-400'
                  : 'text-slate-600 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-400'
              }`}
            >
              {activePrayer.nameDv}
            </span>
            {locationStatus === 'auto' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" title="ޑިވައިސްގެ އޮޓޯ ލޮކޭޝަން" />
            )}
          </div>
          {/* Time (bold display) */}
          <span className={`font-bold font-mono tracking-tight leading-none mt-0.5 ${
            inNavbar
              ? 'text-white text-xs sm:text-lg group-hover:text-amber-300'
              : 'text-slate-900 dark:text-white text-sm sm:text-xl'
          }`}>
            {activePrayer.time}
          </span>
        </div>

        {/* Right Side: Mosque Vector Illustration */}
        <div className="shrink-0 flex items-center justify-center pl-0.5">
          <MosqueIllustration className={`${inNavbar ? 'w-6 h-5 sm:w-9 sm:h-8' : 'w-9 h-8 sm:w-12 sm:h-10'} drop-shadow-sm group-hover:brightness-105 transition-transform group-hover:scale-105`} />
        </div>
      </button>

      {/* Expanded All-Prayers Popover */}
      {showFullSchedule && (
        <div
          dir="rtl"
          className={`absolute top-full mt-2 w-[calc(100vw-1.5rem)] max-w-xs sm:max-w-none sm:w-88 rounded-2xl bg-slate-900/98 text-white backdrop-blur-xl border border-slate-700/80 shadow-2xl p-3.5 sm:p-4 z-50 text-right animate-in fade-in zoom-in-95 duration-200 ${
            inNavbar ? 'right-0 -mr-8 sm:mr-0' : 'right-0'
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <MosqueIllustration className="w-8 h-7 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white font-dhivehi">
                  ނަމާދު ވަގުތުތައް
                </h4>
                {/* Today's Date */}
                <p className="text-[11px] text-slate-400 font-dhivehi font-medium mt-0.5">
                  {schedule.dateStr}
                </p>
                {/* Auto Device Location Indicator */}
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-dhivehi">
                  {locationStatus === 'auto' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md font-medium text-[10px]">
                      <Navigation className="w-2.5 h-2.5" />
                      <span>ޑިވައިސްގެ ލޮކޭޝަން: {schedule.locationName}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-400 text-[10px]">
                      <MapPin className="w-2.5 h-2.5 text-amber-500" />
                      <span>{schedule.locationName}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowFullSchedule(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="ލައްޕާލައްވާ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Prayer list for Today's Date */}
          <div className="py-2.5 space-y-1.5">
            {schedule.prayers.map((prayer) => {
              const isNext = prayer.key === activePrayer.key;
              return (
                <div
                  key={prayer.key}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                    isNext
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-dhivehi text-sm">{prayer.nameDv}</span>
                    {isNext && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold font-dhivehi shadow-xs">
                        ދެން އޮތީ
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-sm font-bold tracking-tight">
                    {prayer.time}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom Bar: Auto location indicator & refresh (Strictly NO source link as requested) */}
          <div className="pt-2.5 mt-1 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 font-dhivehi">
              <Compass className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>ޑިވައިސްގެ އޮޓޯ ލޮކޭޝަނަށް ބަލައިގެން</span>
            </div>
            <button
              onClick={detectDeviceLocation}
              disabled={detectingLocation}
              className="inline-flex items-center gap-1 text-[10px] font-dhivehi font-medium text-amber-400 hover:text-amber-300 transition px-2 py-1 rounded-md hover:bg-amber-950/40 border border-amber-500/20"
              title="ޑިވައިސްގެ ލޮކޭޝަން އަލުން ހޯދާ"
            >
              {detectingLocation ? (
                <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
              ) : (
                <RotateCw className="w-3 h-3" />
              )}
              <span>{detectingLocation ? 'ހޯދަނީ...' : 'ލޮކޭޝަން އަޕްޑޭޓް'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
