import * as React from 'react';
import { toUppercase } from '@repo/commons';
import SupportIcon from './assets/support.svg';

export function Card({
  className,
  title,
  children,
  href,
}: {
  className?: string;
  title: string;
  children: React.ReactNode;
  href: string;
}): React.JSX.Element {
  const handleClick: React.MouseEventHandler<HTMLHeadingElement> = (event) => {
    console.log('* Card click:', event, href);
  };

  return (
    <a
      className={className}
      href={`${href}?utm_source=create-turbo&utm_medium=basic&utm_campaign=create-turbo"`}
      rel="noopener noreferrer"
      target="_blank"
    >
      <img alt="icon" src={SupportIcon} width={100} />
      <h2 onClick={handleClick}>
        {toUppercase(title)} <span>-&gt;</span>
      </h2>
      <div>{children}</div>
    </a>
  );
}

export function add(a: number, b: number): number {
  return a + b;
}
