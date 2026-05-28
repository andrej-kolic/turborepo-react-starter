import React from 'react';
import LogoIcon from './assets/idea.svg'; // TODO: report for bad path
import './styles.css';
import { getEnvironmentVariables } from '../../utils/environment';

export function Header({ title }: { title: string }): React.ReactNode {
  const handleClick: React.MouseEventHandler<HTMLHeadingElement> = (event) => {
    console.log('* Header click:', event);
  };

  const { APP_REACT_VERSION, BUILD_ENVIRONMENT } = getEnvironmentVariables();

  return (
    <div className="Header">
      <img className="Header__logo" alt="Logo" src={LogoIcon} />
      <div className="Header__title" onClick={handleClick}>
        {title}
        <span className="Header__version">
          v{APP_REACT_VERSION} - {BUILD_ENVIRONMENT}
        </span>
      </div>
    </div>
  );
}
