import React, { useEffect, useEffectEvent, type ReactNode } from 'react';

import './styles.css';

export type ListItem = {
  id: string;
  content: ReactNode;
};

type DynamicListProps = {
  items: ListItem[];
  listStatus: 'idle' | 'loading' | 'aborted' | 'error' | 'done';
  fetchNext: () => Promise<void>;
  abortFetch: () => void;
};

export function DynamicList(props: DynamicListProps) {
  const { items, listStatus, fetchNext, abortFetch } = props;

  const containerRef = React.useRef<HTMLDivElement>(null);

  const doFetch = useEffectEvent(async () => {
    if (listStatus === 'loading') return;
    await fetchNext();
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const options: IntersectionObserverInit = {
      root: container,
      rootMargin: '0px',
      threshold: 1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          if (element.classList.contains('DynamicList__trigger')) {
            console.log('Trigger is visible, load more items...');
            void doFetch();
          } else {
            element.classList.add('DynamicList__item--visible');
          }
        } else {
          element.classList.remove('DynamicList__item--visible');
        }
      });
    }, options);

    const items = container.querySelectorAll('.DynamicList__item');
    items.forEach((item) => {
      observer.observe(item);
    });

    if (listStatus === 'idle') {
      const trigger = container.querySelector('.DynamicList__trigger');
      if (trigger) observer.observe(trigger);
    }

    return () => {
      observer.disconnect();
      abortFetch();
    };
  }, [listStatus, abortFetch]);

  return (
    <>
      {/* <div>status: {listStatus}</div> */}

      <div className="DynamicList" ref={containerRef}>
        <ol>
          {items.map((item: ListItem) => (
            <li key={item.id} className="DynamicList__item">
              {item.content}
            </li>
          ))}
        </ol>

        <button
          className={[
            'DynamicList__trigger',
            listStatus === 'idle'
              ? 'DynamicList__trigger--idle'
              : listStatus === 'aborted'
                ? 'DynamicList__trigger--aborted'
                : listStatus === 'loading'
                  ? 'DynamicList__trigger--loading'
                  : listStatus === 'error'
                    ? 'DynamicList__trigger--error'
                    : 'DynamicList__trigger--done',
          ].join(' ')}
          onClick={() => {
            if (
              listStatus === 'idle' ||
              listStatus === 'error' ||
              listStatus === 'aborted'
            ) {
              void fetchNext();
            } else if (listStatus === 'loading') {
              abortFetch();
            }
          }}
        >
          {listStatus === 'loading'
            ? 'Abort load...'
            : listStatus === 'idle'
              ? 'Load more'
              : listStatus === 'aborted'
                ? 'Retry'
                : listStatus === 'error'
                  ? 'Retry'
                  : 'No more items'}
        </button>
      </div>
    </>
  );
}
