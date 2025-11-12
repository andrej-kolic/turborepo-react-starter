import React, { useEffect, useEffectEvent } from 'react';
import { UseScroller, type ItemDto } from './hooks';

import './styles.css';

export function Scroller() {
  const { state, fetchNext, abortFetch } = UseScroller();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const doFetch = useEffectEvent(async () => {
    if (state.status === 'loading') return;
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
          if (element.classList.contains('Scroller__trigger')) {
            console.log('Trigger is visible, load more items...');
            void doFetch();
          } else {
            element.classList.add('Scroller__item--visible');
          }
        } else {
          element.classList.remove('Scroller__item--visible');
        }
      });
    }, options);

    const items = container.querySelectorAll('.Scroller__item');
    items.forEach((item) => {
      observer.observe(item);
    });

    if (state.status === 'idle' && !state.aborted) {
      const trigger = container.querySelector('.Scroller__trigger');
      if (trigger) observer.observe(trigger);
    }

    return () => {
      observer.disconnect();
      abortFetch();
    };
  }, [state, abortFetch]);

  const status = state.status;

  // console.log('* state:', state);

  return (
    <>
      {/* <div>status: {state.status}</div> */}

      <div className="Scroller" ref={containerRef}>
        <ol>
          {state.items.map((item: ItemDto) => (
            <li key={item.id} className="Scroller__item">
              {item.name}
            </li>
          ))}
        </ol>

        <button
          className={[
            'Scroller__trigger',
            status === 'idle'
              ? 'Scroller__trigger--idle'
              : status === 'loading'
                ? 'Scroller__trigger--loading'
                : status === 'error'
                  ? 'Scroller__trigger--error'
                  : 'Scroller__trigger--done',
          ].join(' ')}
          onClick={() => {
            if (status === 'idle' || state.status === 'error') {
              void fetchNext();
            } else if (status === 'loading') {
              abortFetch();
            }
          }}
        >
          {status === 'loading'
            ? 'Abort load...'
            : status === 'idle'
              ? 'Load more'
              : status === 'error'
                ? 'Retry'
                : 'No more items'}
        </button>
      </div>
    </>
  );
}
