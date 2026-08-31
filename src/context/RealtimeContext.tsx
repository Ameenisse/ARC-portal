import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { realtimeClient, RealtimeTableEvent } from '../services/realtimeClient';
import { api } from '../services/api';

interface RealtimeContextType {
  isConnected: boolean;
  activeClientsCount: number;
  lastEvent: RealtimeTableEvent | null;
  lastSyncTimestamp: number;
  triggerSyncAll: (reason?: string) => Promise<void>;
  subscribeToTable: (tables: string | string[], callback: (event: RealtimeTableEvent) => void) => () => void;
  syncCounter: number;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeClientsCount, setActiveClientsCount] = useState(1);
  const [lastEvent, setLastEvent] = useState<RealtimeTableEvent | null>(null);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number>(Date.now());
  const [syncCounter, setSyncCounter] = useState(0);

  useEffect(() => {
    // Listen to connection status
    const unsubConn = realtimeClient.onConnectionChange((connected, count) => {
      setIsConnected(connected);
      setActiveClientsCount(count);
    });

    // Listen to all events for metadata & global sync counter
    const unsubAll = realtimeClient.subscribe('*', (event) => {
      setLastEvent(event);
      setLastSyncTimestamp(Date.now());
      setSyncCounter(prev => prev + 1);
    });

    return () => {
      unsubConn();
      unsubAll();
    };
  }, []);

  const triggerSyncAll = useCallback(async (reason?: string) => {
    try {
      await api.syncAllTables(reason || 'user_requested_refresh');
    } catch (err) {
      console.warn('[RealtimeContext] Failed to trigger syncAllTables:', err);
    }
  }, []);

  const subscribeToTable = useCallback((tables: string | string[], callback: (event: RealtimeTableEvent) => void) => {
    return realtimeClient.subscribe(tables, callback);
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        activeClientsCount,
        lastEvent,
        lastSyncTimestamp,
        triggerSyncAll,
        subscribeToTable,
        syncCounter
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = (): RealtimeContextType => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
