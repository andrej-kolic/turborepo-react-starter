/** Home page (`/`): the scroller demo. */

import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import { Scroller } from '../components/Scroller';

export const Route = createLazyFileRoute('/')({
  component: HomePage,
});

function HomePage(): React.JSX.Element {
  return <Scroller />;
}
