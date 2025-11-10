import { useCallback, useRef, useState } from 'react';

export type FetchResult<T> = {
  items: T[];
  nextCursor: number | null;
};

export type Fetcher<T> = (
  cursor: number,
  pageSize: number,
  signal?: AbortSignal,
) => Promise<FetchResult<T>>;

export type Status = 'idle' | 'loading' | 'done';

export const useService = <T>(fetch: Fetcher<T>, pageSize: number) => {
  const [status, setStatus] = useState<Status>('idle');
  const [items, setItems] = useState<T[]>([]);
  const currentCursor = useRef<number | null>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchNext = useCallback(async () => {
    if (currentCursor.current === null) {
      return;
    }

    // Abort any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this fetch
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setStatus('loading');

    try {
      const data = await fetch(currentCursor.current, pageSize, signal);

      currentCursor.current = data.nextCursor;
      setItems((prevItems) => [...prevItems, ...data.items]);
    } catch (e) {
      // Ignore abort errors and go to finally block
      if (e instanceof Error && e.name === 'AbortError') {
        console.log('* catch aborted');
        return;
      }
      console.error(e);
    } finally {
      setStatus(currentCursor.current !== null ? 'idle' : 'done');
      abortControllerRef.current = null;
    }
  }, [fetch, pageSize]);

  const hasNext = useCallback((): boolean => {
    return currentCursor.current !== null;
  }, []);

  const abortFetch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStatus('idle');
    }
  }, []);

  return {
    fetchNext,
    hasNext,
    abortFetch,
    status,
    items,
  };
};
