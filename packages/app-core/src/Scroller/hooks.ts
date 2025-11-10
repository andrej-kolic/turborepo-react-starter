import { useService, type Fetcher } from '../hooks/use-service';

const PAGE_SIZE = 10;
const TOTAL_ITEMS = 22;
const FETCH_DELAY = 2000;

export const fakeFetchItems: Fetcher<string> = async function (
  startCursor: number,
  pageSize: number = PAGE_SIZE,
  signal?: AbortSignal,
) {
  const items: string[] = [];

  if (startCursor >= TOTAL_ITEMS) {
    return Promise.resolve({
      items: [],
      nextCursor: null,
    });
  }

  const endCursor = Math.min(startCursor + pageSize - 1, TOTAL_ITEMS - 1);

  for (let i = startCursor; i <= endCursor; i++) {
    items.push(`Item ${i + 1}`);
  }

  const nextCursor = endCursor >= TOTAL_ITEMS - 1 ? null : endCursor + 1;

  // cancellable delay
  await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(resolve, FETCH_DELAY);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }
  });

  return Promise.resolve({
    items,
    nextCursor,
  });
};

export function UseScroller() {
  return useService(fakeFetchItems, PAGE_SIZE);
}
