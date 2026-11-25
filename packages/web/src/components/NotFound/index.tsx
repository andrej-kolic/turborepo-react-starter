import React from 'react';
import { Link } from '@tanstack/react-router';

/** Shown in place of a page when no route matches the URL. */
export function NotFound(): React.ReactNode {
  return (
    <section
      className="NotFound"
      aria-label="Page not found"
      data-testid="not-found"
    >
      <h1>Page not found</h1>
      <Link to="/">Go to the home page</Link>
    </section>
  );
}
