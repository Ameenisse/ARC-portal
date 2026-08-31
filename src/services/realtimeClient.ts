/**
 * Client-Side Realtime Database Synchronization Engine
 * Connects to /api/realtime/stream using Server-Sent Events (SSE)
 * Dispatches table mutation events without requiring page refreshes
 */

export interface RealtimeTableEvent {
  table: string;
  action: 'create' | 'update' | 'delete' | 'sync' | 'bulk_update';
  id?: string;
  data?: any;
  timestamp: number;
  aliases?: string[];
  version?: number;
  actorId?: string;
  actorName?: string;
}

export type TableEventListener = (event: RealtimeTableEvent) => void;
export type ConnectionStatusListener = (connected: boolean, clientCount: number) => void;

class RealtimeClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<TableEventListener>> = new Map();
  private wildcardListeners: Set<TableEventListener> = new Set();
  private connectionListeners: Set<ConnectionStatusListener> = new Set();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: any = null;
  private activeClientsCount: number = 1;
  private lastEvent: RealtimeTableEvent | null = null;
  private tableVersions: Record<string, number> = {};

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
      // Re-establish on tab focus/visibility change if disconnected
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !this.isConnected) {
          this.connect();
        }
      });
      // Handle network online/offline events
      window.addEventListener('online', () => {
        this.connect();
      });
    }
  }

  public init() {
    this.connect();
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (e) {
        // ignore
      }
      this.eventSource = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      const url = `/api/realtime/stream?t=${Date.now()}`;
      this.eventSource = new EventSource(url);

      this.eventSource.addEventListener('connected', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.activeClientsCount = payload.clientCount || 1;
          if (payload.tableVersions) {
            this.tableVersions = { ...this.tableVersions, ...payload.tableVersions };
          }
          this.notifyConnectionStatus(true, this.activeClientsCount);
          console.log('[Realtime Client] Connected to database stream. Server epoch:', payload.serverTime);
        } catch (err) {
          console.warn('[Realtime Client] Error parsing connected frame:', err);
        }
      });

      this.eventSource.addEventListener('ping', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          this.activeClientsCount = payload.clientCount || this.activeClientsCount;
          this.notifyConnectionStatus(true, this.activeClientsCount);
        } catch (err) {
          // ignore
        }
      });

      this.eventSource.addEventListener('table_change', (e: MessageEvent) => {
        try {
          const event: RealtimeTableEvent = JSON.parse(e.data);
          this.lastEvent = event;
          if (event.table) {
            this.tableVersions[event.table] = (this.tableVersions[event.table] || 0) + 1;
          }
          this.dispatchEvent(event);
        } catch (err) {
          console.warn('[Realtime Client] Error parsing table_change event:', err);
        }
      });

      this.eventSource.addEventListener('sync_all', (e: MessageEvent) => {
        try {
          const event: RealtimeTableEvent = JSON.parse(e.data);
          this.lastEvent = event;
          this.dispatchEvent(event);
        } catch (err) {
          console.warn('[Realtime Client] Error parsing sync_all event:', err);
        }
      });

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionStatus(true, this.activeClientsCount);
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        this.notifyConnectionStatus(false, this.activeClientsCount);
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        this.scheduleReconnect();
      };
    } catch (err) {
      console.warn('[Realtime Client] Connection error:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    // Exponential backoff: min 1.5s, max 10s
    const delay = Math.min(10000, 1500 * Math.pow(1.3, Math.min(this.reconnectAttempts, 6)));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private normalizeTableKey(table: string): string {
    return table.toLowerCase().replace(/[-_]/g, '');
  }

  private dispatchEvent(event: RealtimeTableEvent) {
    // 1. Wildcard listeners
    for (const listener of this.wildcardListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[Realtime Client] Listener error:', err);
      }
    }

    if (event.table === '*') {
      // Broadcast to all registered tables
      for (const [, set] of this.listeners) {
        for (const listener of set) {
          try {
            listener(event);
          } catch (err) {
            console.error('[Realtime Client] Listener error:', err);
          }
        }
      }
      return;
    }

    // 2. Specific table listeners and aliases
    const tablesToNotify = new Set<string>();
    if (event.table) {
      tablesToNotify.add(this.normalizeTableKey(event.table));
    }
    if (event.aliases && Array.isArray(event.aliases)) {
      for (const a of event.aliases) {
        tablesToNotify.add(this.normalizeTableKey(a));
      }
    }

    for (const t of tablesToNotify) {
      const set = this.listeners.get(t);
      if (set) {
        for (const listener of set) {
          try {
            listener(event);
          } catch (err) {
            console.error('[Realtime Client] Listener error for table', t, err);
          }
        }
      }
    }
  }

  private notifyConnectionStatus(connected: boolean, count: number) {
    for (const listener of this.connectionListeners) {
      try {
        listener(connected, count);
      } catch (err) {
        // ignore
      }
    }
  }

  /**
   * Subscribe to specific database table(s) or '*' for all tables
   */
  public subscribe(tables: string | string[], callback: TableEventListener): () => void {
    const tableArr = Array.isArray(tables) ? tables : [tables];

    for (const t of tableArr) {
      if (t === '*') {
        this.wildcardListeners.add(callback);
      } else {
        const norm = this.normalizeTableKey(t);
        if (!this.listeners.has(norm)) {
          this.listeners.set(norm, new Set());
        }
        this.listeners.get(norm)!.add(callback);
      }
    }

    // Unsubscribe function
    return () => {
      for (const t of tableArr) {
        if (t === '*') {
          this.wildcardListeners.delete(callback);
        } else {
          const norm = this.normalizeTableKey(t);
          const set = this.listeners.get(norm);
          if (set) {
            set.delete(callback);
            if (set.size === 0) {
              this.listeners.delete(norm);
            }
          }
        }
      }
    };
  }

  /**
   * Listen to connection status changes
   */
  public onConnectionChange(callback: ConnectionStatusListener): () => void {
    this.connectionListeners.add(callback);
    callback(this.isConnected, this.activeClientsCount);
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      activeClientsCount: this.activeClientsCount,
      lastEvent: this.lastEvent,
      tableVersions: { ...this.tableVersions }
    };
  }
}

export const realtimeClient = new RealtimeClient();
