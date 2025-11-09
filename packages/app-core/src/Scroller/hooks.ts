import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createPaginatedFetcher,
  fakeFetchItems,
  type PaginatedFetcher,
} from './api';

export type Status = 'idle' | 'loading';

export function UseScroller() {
  const [status, setStatus] = useState<Status>('idle');
  const [items, setItems] = useState<string[]>([]);

  const fetcherRef = useRef<PaginatedFetcher<string> | null>(null);

  // Initialize the fetcher once
  useEffect(() => {
    fetcherRef.current = createPaginatedFetcher(fakeFetchItems);

    return () => {
      fetcherRef.current?.cancel();
    };
  }, []);

  const fetchNext = useCallback(async (): Promise<string[]> => {
    if (!fetcherRef.current) return [];

    setStatus('loading');

    try {
      const newItems = await fetcherRef.current.fetchNext();
      setStatus('idle');
      setItems((prevItems) => [...prevItems, ...newItems]);
      return newItems;
    } catch {
      setStatus('idle');
      return [];
    }
  }, []);

  const abortFetch = useCallback(() => {
    fetcherRef.current?.cancel();
    setStatus('idle');
  }, []);

  return {
    status,
    items,
    fetchNext,
    abortFetch,
  };
}
