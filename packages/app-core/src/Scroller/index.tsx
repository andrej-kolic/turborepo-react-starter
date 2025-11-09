import React, { useEffect, useState } from 'react';
import './styles.css';

export function Scroller() {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [items, setItems] = useState<string[]>([]);

  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const options: IntersectionObserverInit = {
      root: container,
      rootMargin: '0px',
      threshold: 1,
    };

    let timeoutId: NodeJS.Timeout;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          if (element.classList.contains('Scroller__trigger')) {
            console.log('Trigger is visible, load more items...');
            setStatus('loading');
            timeoutId = setTimeout(() => {
              setItems((prevItems) => [
                ...prevItems,
                ...(Array(10).fill('New Item') as string[]),
              ]);
              setStatus('idle');
            }, 2000);
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
      clearTimeout(timeoutId);
    };
  }, [items]);

  return (
    <div className="Scroller" ref={containerRef}>
      <ol>
        {items.map((_: unknown, index: number) => (
          <li key={index} className="Scroller__item">
            Item {index + 1}
          </li>
        ))}
      </ol>
      <div
        className={`Scroller__trigger ${status === 'loading' ? 'Scroller__trigger--loading' : ''}`}
      >
        {status === 'loading' ? 'Loading...' : 'Load more'}
      </div>
    </div>
  );
}
