import React from 'react';
import TurboRepoImg from '../assets/turborepo.svg'; // TODO: report for bad path
import './styles.css';

export function Header(): React.ReactNode {
  const handleClick: React.MouseEventHandler<HTMLHeadingElement> = (event) => {
    console.log('* Header click:', event);
  };

  return (
    <div className="Header">
      <img alt="Turborepo" src={TurboRepoImg} />
      <h1 onClick={handleClick}>Starter app</h1>
    </div>
  );
}
