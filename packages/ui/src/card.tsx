import * as React from "react";
import { toUppercase } from '@repo/commons';
import SupportIcon from './assets/support.svg';
import * as TR from 'trim-lines';  // TODO: remove

console.log('* TR:', TR); // TODO: remove

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
}): JSX.Element {
  return (
    <a
      className={className}
      href={`${href}?utm_source=create-turbo&utm_medium=basic&utm_campaign=create-turbo"`}
      rel="noopener noreferrer"
      target="_blank"
    >
      <img alt="icon" src={SupportIcon} width={100} />
      <h2>
        {toUppercase(title)} <span>-&gt;</span>
      </h2>
      <p>{children}</p>
    </a>
  );
}

export function add(a: number, b: number): number {
  return a + b;
}
