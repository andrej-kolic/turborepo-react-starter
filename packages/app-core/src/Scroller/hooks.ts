import { useCallback, useRef, useState } from 'react';
import {
  createPaginatedFetcher,
  fakeFetchItems,
  type PaginatedFetcher,
} from './api';

export type Status = 'idle' | 'loading' | 'done';

export function UseScroller() {
  const [status, setStatus] = useState<Status>('idle');
  const [items, setItems] = useState<string[]>([]);

  const fetcherRef = useRef<PaginatedFetcher<string>>(
    createPaginatedFetcher(fakeFetchItems),
  );

  const fetchNext = useCallback(async (): Promise<string[]> => {
    if (!fetcherRef.current.hasNext()) {
      setStatus('done');
      return [];
    }

    setStatus('loading');

    try {
      const newItems = await fetcherRef.current.fetchNext();
      setItems((prevItems) => [...prevItems, ...newItems]);
      setStatus(fetcherRef.current.hasNext() ? 'idle' : 'done');
      return newItems;
    } catch {
      setStatus('idle'); // TODO: error
      return [];
    }
  }, []);

  const abortFetch = useCallback(() => {
    fetcherRef.current.cancel();
    setStatus(fetcherRef.current.hasNext() ? 'idle' : 'done');
  }, []);

  return {
    status,
    items,
    fetchNext,
    abortFetch,
  };
}
