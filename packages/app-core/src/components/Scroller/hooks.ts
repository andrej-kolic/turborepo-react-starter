import { useCursorFetcher, type Fetcher } from '../../hooks/use-cursor-fetcher';

const PAGE_SIZE = 10;
const TOTAL_ITEMS = 22;
const FETCH_DELAY = 1000;

export type ItemDto = {
  id: number;
  name: string;
};

let requestCount = 0;

/**
 * Demo Fetcher that simulates paginated data with a fixed delay.
 * Honors AbortSignal and rejects every third request to exercise error handling.
 */
export const fakeFetchItems: Fetcher<ItemDto, number> = async function (
  cursor: number | undefined,
  pageSize: number,
  signal?: AbortSignal,
) {
  const items: ItemDto[] = [];

  const startCursor = cursor ?? 0;
  requestCount++;

  if (requestCount % 3 === 0) {
    return Promise.reject(new Error('Simulated fetch error'));
  }

  if (startCursor >= TOTAL_ITEMS) {
    return Promise.resolve({
      items: [],
      nextCursor: null,
    });
  }

  const endCursor = Math.min(startCursor + pageSize - 1, TOTAL_ITEMS - 1);

  for (let i = startCursor; i <= endCursor; i++) {
    items.push({ id: i, name: `Item ${i + 1}` });
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
  return useCursorFetcher(fakeFetchItems, PAGE_SIZE);
}
