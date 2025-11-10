import React from 'react';
import LogoIcon from './assets/idea.svg'; // TODO: report for bad path
import './styles.css';

export function Header({ title }: { title: string }): React.ReactNode {
  const handleClick: React.MouseEventHandler<HTMLHeadingElement> = (event) => {
    console.log('* Header click:', event);
  };

  return (
    <div className="Header">
      <img className="Header__logo" alt="Logo" src={LogoIcon} />
      <div className="Header__title" onClick={handleClick}>
        {title}
      </div>
    </div>
  );
}
