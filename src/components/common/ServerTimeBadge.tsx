import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { api } from '../../services/api';
import { formatDateTime, MALDIVES_TZ } from '../../utils/formatters';

interface ServerTimeBadgeProps {
  className?: string;
  showIcon?: boolean;
}

export const ServerTimeBadge: React.FC<ServerTimeBadgeProps> = ({ className = '', showIcon = true }) => {
  const [timeOffsetMs, setTimeOffsetMs] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [serverTimezone, setServerTimezone] = useState<string>('Indian/Maldives (GMT+05:00)');
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchServerTime = async () => {
      try {
        const start = Date.now();
        const res = await api.getSystemTime();
        const end = Date.now();
        const latency = Math.round((end - start) / 2);
        const serverNow = res.serverEpoch + latency;
        const offset = serverNow - Date.now();

        if (isMounted) {
          setTimeOffsetMs(offset);
          setCurrentTime(new Date(Date.now() + offset));
          if (res.timezone) setServerTimezone(res.timezone);
          setSynced(true);
        }
      } catch (e) {
        if (isMounted) setSynced(false);
      }
    };

    fetchServerTime();
    // Re-sync with server clock every 60 seconds
    const syncInterval = setInterval(fetchServerTime, 60000);

    // Local tick every second adjusted by server offset
    const tickInterval = setInterval(() => {
      if (isMounted) {
        setCurrentTime(new Date(Date.now() + timeOffsetMs));
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
      clearInterval(tickInterval);
    };
  }, [timeOffsetMs]);

  // Format time in Maldives Time Zone (24h or HH:mm:ss)
  const formattedTimeStr = (() => {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: MALDIVES_TZ,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(currentTime);

      const hours = parts.find(p => p.type === 'hour')?.value || '00';
      const minutes = parts.find(p => p.type === 'minute')?.value || '00';
      const seconds = parts.find(p => p.type === 'second')?.value || '00';
      return `${hours}:${minutes}:${seconds}`;
    } catch {
      return formatDateTime(currentTime, true).split(' ')[1] || '00:00:00';
    }
  })();

  const formattedDateStr = (() => {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: MALDIVES_TZ,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).formatToParts(currentTime);

      const day = parts.find(p => p.type === 'day')?.value || '00';
      const month = parts.find(p => p.type === 'month')?.value || '00';
      const year = parts.find(p => p.type === 'year')?.value || '2026';
      return `${day}/${month}/${year}`;
    } catch {
      return formatDateTime(currentTime, false).split(' ')[0] || '';
    }
  })();

  return (
    <div
      title={`Official Server Hosting Time (${serverTimezone})`}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs font-mono shadow-inner ${className}`}
    >
      <div className="relative flex items-center justify-center shrink-0">
        <span className={`w-2 h-2 rounded-full ${synced ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
        <span className={`absolute w-3 h-3 rounded-full ${synced ? 'bg-emerald-500/30 animate-ping' : 'bg-amber-500/30'}`} />
      </div>

      {showIcon && <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0" />}

      <div className="flex items-center gap-1.5 leading-none">
        <span className="text-[10px] font-bold tracking-wider text-orange-400 uppercase">
          {serverTimezone.includes('Maldives') ? 'MVT' : 'TIME'}
        </span>
        <span className="font-bold text-white font-mono tracking-tight">{formattedTimeStr}</span>
        <span className="text-[10px] text-slate-400 hidden lg:inline font-sans">({formattedDateStr})</span>
      </div>
    </div>
  );
};
