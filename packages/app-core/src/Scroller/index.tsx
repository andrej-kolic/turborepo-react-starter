import React, { useEffect, useEffectEvent } from 'react';
import { UseScroller } from './hooks2';

import './styles.css';

export function Scroller() {
  const { status, items, fetchNext, abortFetch } = UseScroller();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const doFetch = useEffectEvent(async () => {
    if (status === 'loading') return;
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

    const trigger = container.querySelector('.Scroller__trigger');
    if (trigger) observer.observe(trigger);

    return () => {
      observer.disconnect();
      abortFetch();
    };
  }, [items, abortFetch]);

  return (
    <>
      <div>status: {status}</div>

      <div className="Scroller" ref={containerRef}>
        <ol>
          {items.map((item: string, index: number) => (
            <li key={index} className="Scroller__item">
              {item}
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
                : 'Scroller__trigger--done',
          ].join(' ')}
          onClick={() => {
            if (status === 'idle') {
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
              : 'No more items'}
        </button>
      </div>
    </>
  );
}
