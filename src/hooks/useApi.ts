import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError } from '../api/client';

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  /** True while a background (auto-refresh) fetch is in flight; data stays visible. */
  refreshing: boolean;
  error: ApiError | null;
  reload: () => void;
  /** Epoch ms of the last successful fetch, or null if none has succeeded yet. */
  lastUpdated: number | null;
}

export interface UseApiOptions {
  /**
   * When set, silently re-fetch every `refreshMs` milliseconds without flipping
   * `loading` (stale data stays on screen until the new data arrives). A failed
   * background refresh keeps the last good data instead of surfacing an error.
   * Ticks are skipped while the tab is hidden.
   */
  refreshMs?: number;
}

// Generic async-data hook. Re-runs when `deps` change or `reload()` is called,
// and ignores results from superseded/aborted runs so state never goes stale.
// Pass `{ refreshMs }` to enable silent background polling.
export function useApi<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  options: UseApiOptions = {},
): UseApiResult<T> {
  const { refreshMs } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);

  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // Primary load: mount, dependency change, or explicit reload(). Shows `loading`.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLastUpdated(Date.now());
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError ? e : new ApiError(e?.message ? String(e.message) : String(e)),
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  // Silent background refresh on an interval. Never toggles `loading`; on failure
  // it keeps the last good data rather than replacing it with an error.
  useEffect(() => {
    if (!refreshMs) return;
    let cancelled = false;
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      setRefreshing(true);
      fnRef
        .current()
        .then((result) => {
          if (cancelled) return;
          setData(result);
          setLastUpdated(Date.now());
          setError(null);
        })
        .catch(() => {
          /* keep stale data on a background failure */
        })
        .finally(() => {
          if (!cancelled) setRefreshing(false);
        });
    };
    const id = window.setInterval(tick, refreshMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshMs, ...deps]);

  return { data, loading, refreshing, error, reload, lastUpdated };
}
