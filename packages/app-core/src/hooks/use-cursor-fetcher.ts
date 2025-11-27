import { useCallback, useState } from 'react';

export type FetchResult<T, C> = {
  items: T[];
  nextCursor: C | null;
};

export type Fetcher<T, C> = (
  cursor: C | undefined,
  pageSize: number,
  signal?: AbortSignal,
) => Promise<FetchResult<T, C>>;

export type Status = 'idle' | 'loading' | 'success' | 'error' | 'done';

export type State<T, C> =
  | { status: 'idle'; items: T[]; nextCursor: C | undefined; aborted: boolean }
  | {
      status: 'loading';
      items: T[];
      currentCursor: C | undefined;
      abortController: AbortController;
    }
  | { status: 'error'; items: T[]; nextCursor: C | undefined; message: string }
  | { status: 'done'; items: T[] };

export const useCursorFetcher = <T, C>(
  fetch: Fetcher<T, C>,
  pageSize: number,
) => {
  const [state, setState] = useState<State<T, C>>({
    status: 'idle',
    items: [],
    nextCursor: undefined,
    aborted: false,
  });

  const fetchNext = useCallback(async () => {
    console.log('* fetchNext called:', state);

    if (state.status == 'loading' || state.status === 'done') {
      return;
    }

    // TODO: Abort any ongoing fetch?

    const previousState = state;
    const abortController = new AbortController();
    setState({
      status: 'loading',
      items: state.items,
      currentCursor: state.nextCursor,
      abortController,
    });

    try {
      const data = await fetch(
        state.nextCursor,
        pageSize,
        abortController.signal,
      );
      const newItems = [...state.items, ...data.items];

      // console.log('* fetchNext succeeded:', data, newItems);

      if (data.nextCursor === null) {
        setState({ status: 'done', items: newItems });
      } else {
        setState({
          status: 'idle',
          items: newItems,
          nextCursor: data.nextCursor,
          aborted: false,
        });
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        // console.log('* catch aborted');
        setState({
          status: 'idle',
          items: previousState.items,
          nextCursor: previousState.nextCursor,
          aborted: true,
        });
        return;
      }
      console.error(e);
      setState({
        status: 'error',
        items: state.items,
        nextCursor: state.nextCursor,
        message: (e as Error).message,
      });
    }
  }, [fetch, pageSize, state]);

  const abortFetch = useCallback(() => {
    console.log('* abortFetch called:', state);
    if (state.status !== 'loading') {
      return;
    }

    state.abortController.abort();
  }, [state]);

  return {
    fetchNext,
    abortFetch,
    state,
  };
};
