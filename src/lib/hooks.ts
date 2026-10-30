'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
  setData: (updater: T | ((prev: T | undefined) => T | undefined)) => void;
}

/**
 * Minimal client-side data hook. `key === null` disables fetching (e.g. until an org is selected).
 * The fetcher is captured per key change; stale responses are ignored.
 */
export function useApi<T>(key: string | null, fetcher: () => Promise<T>): AsyncState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(key !== null);
  const [nonce, setNonce] = useState(0);
  const [prevKey, setPrevKey] = useState(key);
  // Reset during render (not in an effect) so the previous key's data is never painted.
  if (prevKey !== key) {
    setPrevKey(key);
    setDataState(undefined);
    setError(null);
    setLoading(key !== null);
  }
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (key === null) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((d) => {
        if (active) setDataState(d);
      })
      .catch((e: unknown) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((updater: T | ((prev: T | undefined) => T | undefined)) => {
    setDataState((prev) => (typeof updater === 'function' ? (updater as (p: T | undefined) => T | undefined)(prev) : updater));
  }, []);

  return { data, error, loading, reload, setData };
}

/** Calls `fn` every `ms` while `enabled`. */
export function useInterval(fn: () => void, ms: number, enabled: boolean): void {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!enabled) return;
    const t = window.setInterval(() => ref.current(), ms);
    return () => window.clearInterval(t);
  }, [ms, enabled]);
}

export function useLocalStorage(key: string, initial: string | null): [string | null, (v: string | null) => void] {
  const [value, setValue] = useState<string | null>(initial);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(key);
      if (v !== null) setValue(v);
    } catch {
      /* storage unavailable */
    }
  }, [key]);
  const set = useCallback(
    (v: string | null) => {
      setValue(v);
      try {
        if (v === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, v);
      } catch {
        /* storage unavailable */
      }
    },
    [key],
  );
  return [value, set];
}
