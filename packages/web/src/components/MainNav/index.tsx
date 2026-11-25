import React from 'react';
import { Link } from '@tanstack/react-router';
import './styles.css';

/** Links to every page, shown under the header on all of them. */
export function MainNav(): React.ReactNode {
  return (
    <nav className="MainNav" aria-label="Main">
      <Link to="/" className="MainNav__link" activeOptions={{ exact: true }}>
        Home
      </Link>
      <Link to="/demo/asset-imports" className="MainNav__link">
        Asset imports
      </Link>
      <Link to="/todos" className="MainNav__link">
        Todos
      </Link>
      <Link to="/settings" className="MainNav__link">
        Settings
      </Link>
      <Link to="/about" className="MainNav__link">
        About
      </Link>
    </nav>
  );
}
