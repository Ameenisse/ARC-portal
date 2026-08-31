import { useEffect, useRef } from 'react';
import { realtimeClient, RealtimeTableEvent } from '../services/realtimeClient';

/**
 * useTableSync Hook
 * Subscribes to real-time mutations on one or more database tables.
 * When any matching mutation occurs, onSync callback is called to update state or refetch data instantly without refreshing!
 *
 * @param tables Array of table names or single table name string (e.g. ['members', 'users'], 'quiz_questions', 'budget')
 * @param onSync Callback function invoked when any matching table is created, updated, or deleted
 * @param enabled Optional boolean flag to enable/disable subscription (default: true)
 */
export function useTableSync(
  tables: string | string[],
  onSync: (event: RealtimeTableEvent) => void,
  enabled: boolean = true
) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = realtimeClient.subscribe(tables, (event) => {
      if (onSyncRef.current) {
        onSyncRef.current(event);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [Array.isArray(tables) ? tables.join(',') : tables, enabled]);
}
