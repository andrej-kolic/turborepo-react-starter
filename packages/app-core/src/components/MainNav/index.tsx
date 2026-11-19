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
      <Link to="/about" className="MainNav__link">
        About
      </Link>
    </nav>
  );
}
