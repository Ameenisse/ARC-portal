import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { PublicSiteData } from '../types';

const CACHE_KEY = 'arc_cached_public_site_data_v1';

function isValidPublicSiteData(obj: any): obj is PublicSiteData {
  return Boolean(obj && typeof obj === 'object' && obj.branding && obj.sectionVisibility && Array.isArray(obj.slideshow));
}

// Global in-memory cache
let memoryCache: PublicSiteData | null = (() => {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (isValidPublicSiteData(parsed)) return parsed;
        sessionStorage.removeItem(CACHE_KEY);
      }
    } catch {
      // ignore
    }
  }
  return null;
})();

const listeners = new Set<(data: PublicSiteData) => void>();

export function updatePublicSiteDataCache(newData: PublicSiteData) {
  if (!isValidPublicSiteData(newData)) return;
  memoryCache = newData;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(newData));
    } catch {
      // ignore
    }
  }
  listeners.forEach((listener) => listener(newData));
}

/**
 * usePublicSiteData: SWR hook for public website content.
 * Returns cached data instantly to make page transitions silky-smooth,
 * while refreshing in the background.
 */
export function usePublicSiteData() {
  const [data, setData] = useState<PublicSiteData | null>(memoryCache);
  const [loading, setLoading] = useState<boolean>(!memoryCache);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Subscribe to cache updates from any other component
    const handleUpdate = (updated: PublicSiteData) => {
      if (isMountedRef.current) {
        setData(updated);
        setLoading(false);
      }
    };
    listeners.add(handleUpdate);

    // If we don't have data, or if we want to ensure fresh data in background:
    api.getPublicSiteData()
      .then((fresh) => {
        if (fresh) {
          updatePublicSiteDataCache(fresh);
        }
      })
      .catch((err) => {
        console.warn('[usePublicSiteData] Background revalidation failed:', err);
        if (isMountedRef.current && !memoryCache) {
          setError(err.message || 'Failed to load content');
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setLoading(false);
        }
      });

    return () => {
      isMountedRef.current = false;
      listeners.delete(handleUpdate);
    };
  }, []);

  const refresh = async (silent = true) => {
    if (!silent && !data) setLoading(true);
    try {
      const fresh = await api.getPublicSiteData();
      if (fresh) {
        updatePublicSiteDataCache(fresh);
        setError(null);
      }
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to refresh');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  return { data, loading: loading && !data, error, refresh };
}
