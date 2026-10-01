/**
 * useOfflineData
 *
 * Resilient Offline-First React Hook.
 * - Reads instantly from local IndexedDB / OPFS disk snapshots (0ms latency).
 * - Transparently handles remote rehydration when online.
 * - Enqueues background sync mutations with Last-Write-Wins timestamps.
 * - Reacts to online/offline network transitions and SW sync broadcasts.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { offlineRepository } from '../offline/offlineRepository';
import { sqliteService } from '../offline/sqliteService';
import { useAuth } from '@/core/lib/auth';
import { useQueryClient } from '@tanstack/react-query';

export interface UseOfflineDataOptions<T> {
  table: string;
  fetcher?: () => Promise<T[]>;
  initialData?: T[];
  queryKey?: any[];
}

export function useOfflineData<T extends { id?: string; updated_at?: string }>({
  table,
  fetcher,
  initialData = [],
  queryKey
}: UseOfflineDataOptions<T>) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id || 'guest';

  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  /**
   * Loads data from local storage first (instant), then triggers remote hydration if online.
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Instant local read from SQLite/Dexie & OPFS
      const localRecords = await offlineRepository.query<T>(table, userId);
      if (Array.isArray(localRecords) && localRecords.length > 0) {
        setData(localRecords);
      }

      // 2. Fetch fresh if online and custom fetcher provided
      if (typeof navigator !== 'undefined' && navigator.onLine && fetcher) {
        try {
          const freshData = await fetcher();
          if (Array.isArray(freshData)) {
            await sqliteService.upsertBatch(table, userId, freshData);
            setData(freshData);
          }
        } catch (fetchErr) {
          console.warn(`[useOfflineData] Network fetch failed for ${table}, using local disk state:`, fetchErr);
        }
      }
    } catch (err) {
      console.error(`[useOfflineData] Error reading local data for ${table}:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [table, userId, fetcher]);

  // Handle Online / Offline network triggers and sync completion
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      loadData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleSyncComplete = () => {
      loadData();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('rupeebill-sync-complete', handleSyncComplete);

    loadData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('rupeebill-sync-complete', handleSyncComplete);
    };
  }, [loadData]);

  /**
   * Optimistically creates or updates a record locally and queues background sync
   */
  const saveRecord = useCallback(
    async (item: T): Promise<T> => {
      const saved = await offlineRepository.save(table, userId, item);

      // Optimistic update of local UI state
      setData((prev) => {
        const index = prev.findIndex((p) => p.id && saved.id && p.id === saved.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = saved;
          return next;
        }
        return [saved, ...prev];
      });

      // Invalidate related React Query cache if key provided
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey });
      }

      return saved;
    },
    [table, userId, queryKey, queryClient]
  );

  /**
   * Optimistically deletes a record locally and queues background sync deletion
   */
  const removeRecord = useCallback(
    async (recordId: string): Promise<void> => {
      await offlineRepository.delete(table, userId, recordId);

      // Optimistic delete in local UI state
      setData((prev) => prev.filter((item) => item.id !== recordId));

      if (queryKey) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
    [table, userId, queryKey, queryClient]
  );

  return {
    data,
    isLoading,
    isOnline,
    saveRecord,
    removeRecord,
    refetch: loadData
  };
}