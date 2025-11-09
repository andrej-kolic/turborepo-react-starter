import { useCallback, useRef, useState } from 'react';

export type Status = 'idle' | 'loading';

const PAGE_SIZE = 10;

export function UseScroller() {
  const [status, setStatus] = useState<Status>('idle');
  const [items, setItems] = useState<string[]>([]);

  const nextIdRef = useRef<number>(0);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNext = useCallback(async (): Promise<string[]> => {
    setStatus('loading');

    return new Promise((resolve) => {
      timeoutIdRef.current = setTimeout(() => {
        let index = nextIdRef.current;
        const newItems: string[] = [];
        Array.from({ length: PAGE_SIZE }).forEach(() => {
          newItems.push(`Item ${String(++index)}`);
        });
        setStatus('idle');
        setItems((prevItems) => [...prevItems, ...newItems]);
        nextIdRef.current += PAGE_SIZE;

        timeoutIdRef.current = null;
        resolve(newItems);
      }, 2000);
    });
  }, []);

  const abortFetch = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
      setStatus('idle');
    }
  }, []);

  return {
    status,
    items,
    fetchNext,
    abortFetch,
  };
}
