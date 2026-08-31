import React, { useState } from 'react';
import { useRealtime } from '../../context/RealtimeContext';
import { RefreshCw, Radio, CheckCircle2, AlertCircle, Database, Zap } from 'lucide-react';
import { useToast } from './Toast';

interface RealtimeSyncBadgeProps {
  className?: string;
  showText?: boolean;
  theme?: 'dark' | 'light';
}

export const RealtimeSyncBadge: React.FC<RealtimeSyncBadgeProps> = ({
  className = '',
  showText = true,
  theme = 'dark'
}) => {
  const { isConnected, activeClientsCount, lastEvent, lastSyncTimestamp, triggerSyncAll } = useRealtime();
  const { showToast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPopover, setShowPopover] = useState(false);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSyncing(true);
    try {
      await triggerSyncAll('manual_badge_click');
      showToast('success', 'Database tables synchronized across all screens.');
    } catch (err) {
      showToast('error', 'Sync signal failed to send.');
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  const timeAgo = () => {
    const seconds = Math.floor((Date.now() - lastSyncTimestamp) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ago`;
  };

  const isDark = theme === 'dark';

  return (
    <div className="relative inline-block">
      <div
        id="realtime-sync-indicator-pill"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border select-none ${
          isConnected
            ? isDark
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60 shadow-xs'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs'
            : isDark
              ? 'bg-amber-950/40 text-amber-400 border-amber-800/60'
              : 'bg-amber-50 text-amber-700 border-amber-200'
        } ${className}`}
      >
        <button
          type="button"
          id="realtime-sync-indicator-btn"
          onClick={() => setShowPopover(!showPopover)}
          title={isConnected ? 'Real-time database sync active' : 'Connecting to database sync stream...'}
          className="flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity"
        >
          <span className="relative flex h-2 w-2">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
          </span>
          
          {showText && (
            <span className="tracking-wide">
              {isConnected ? 'Live Sync' : 'Reconnecting'}
            </span>
          )}
        </button>

        <button
          type="button"
          id="realtime-sync-quick-refresh-btn"
          onClick={handleManualSync}
          className={`p-0.5 rounded-full hover:bg-black/10 transition-colors cursor-pointer ${isSyncing ? 'animate-spin' : ''}`}
          title="Trigger instant sync on all tables"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Popover Card */}
      {showPopover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPopover(false)}
          />
          <div
            className={`absolute right-0 mt-2 w-72 rounded-xl p-3.5 shadow-xl border z-50 animate-in fade-in zoom-in-95 duration-150 ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200 shadow-black/60'
                : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold">Realtime Database Sync</h4>
                  <p className="text-[10px] text-slate-400">Zero-refresh table stream</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}>
                {isConnected ? 'Connected' : 'Connecting'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Active Clients:</span>
                <span className="font-mono text-slate-200 font-medium">{activeClientsCount}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Last Stream Sync:</span>
                <span className="text-slate-300">{timeAgo()}</span>
              </div>
              {lastEvent && (
                <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-[11px]">
                  <div className="text-slate-400 mb-0.5 text-[10px]">Latest Mutation:</div>
                  <div className="font-mono text-emerald-300 truncate">
                    {lastEvent.table}: {lastEvent.action} {lastEvent.id ? `(${lastEvent.id})` : ''}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex gap-2">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Zap className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span>{isSyncing ? 'Syncing Tables...' : 'Sync Tables Now'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
