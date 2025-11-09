const PAGE_SIZE = 10;
const FETCH_DELAY = 2000;

export type FetchResult<T> = {
  items: T[];
  nextCursor: number | null;
};

export type PaginatedFetcher<T> = {
  fetchNext(): Promise<T[]>;
  cancel(): void;
};

/**
 * Creates a paginated fetcher with cursor-based pagination.
 * The fake fetch simulates API delays with a cancellable timeout.
 */
export function createPaginatedFetcher<T>(
  fetchFn: (cursor: number, pageSize: number) => Promise<FetchResult<T>>,
  pageSize: number = PAGE_SIZE,
): PaginatedFetcher<T> {
  let currentCursor: number | null = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const fetchNext = async (): Promise<T[]> => {
    if (currentCursor === null) {
      return []; // No more data to fetch
    }

    const cursor = currentCursor;

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        void (async () => {
          try {
            const result = await fetchFn(cursor, pageSize);
            currentCursor = result.nextCursor;
            timeoutId = null;
            resolve(result.items);
          } catch (error) {
            timeoutId = null;
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        })();
      }, FETCH_DELAY);
    });
  };

  return {
    fetchNext,
    cancel,
  };
}

/**
 * Fake fetch function that simulates API pagination with cursor.
 */
export function fakeFetchItems(
  cursor: number,
  pageSize: number,
): Promise<FetchResult<string>> {
  const items: string[] = [];

  for (let i = 0; i < pageSize; i++) {
    items.push(`Item ${String(cursor + i + 1)}`);
  }

  return Promise.resolve({
    items,
    nextCursor: cursor + pageSize,
  });
}
