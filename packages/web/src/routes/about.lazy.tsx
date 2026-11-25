/** About page (`/about`): the second page, which shows navigation and per-page files working. */

import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';

export const Route = createLazyFileRoute('/about')({
  component: AboutPage,
});

function AboutPage(): React.JSX.Element {
  return (
    <section className="AboutPage" aria-label="About" data-testid="about-page">
      <h1>About</h1>
      <p>
        This page loads in its own file: the main bundle has only its route, not
        this component.
      </p>
    </section>
  );
}
