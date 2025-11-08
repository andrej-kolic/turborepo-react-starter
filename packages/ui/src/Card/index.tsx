import React from 'react';
import { toUppercase } from '@repo/commons';
import ImageIcon from '../assets/picture.svg'; // TODO: named import?
import './styles.css';

export type CardProps = {
  className?: string;
  image?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  href?: string;
};

export function Card({
  className,
  image,
  title,
  children,
}: CardProps): React.JSX.Element {
  const handleClick: React.MouseEventHandler<HTMLHeadingElement> = (event) => {
    console.log('* Card click:', event);
  };

  return (
    <div
      className={`Card ${className ?? ''}`}
      // href={`${href}?utm_source=create-turbo&utm_medium=basic&utm_campaign=create-turbo"`}
      // rel="noopener noreferrer"
      // target="_blank"
    >
      <div className="Card__image">
        {image ?? <img alt="icon" src={ImageIcon} />}
      </div>

      <div className="Card__title" onClick={handleClick}>
        {toUppercase(title)}
      </div>

      <div className="Card__content">{children}</div>
    </div>
  );
}
