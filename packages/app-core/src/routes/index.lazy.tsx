/** Home page (`/`): the resource cards and the scroller demo. */

import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import { ResourceCards } from '../components/ResourceCards';
import { Scroller } from '../components/Scroller';

export const Route = createLazyFileRoute('/')({
  component: HomePage,
});

function HomePage(): React.JSX.Element {
  return (
    <>
      <ResourceCards />
      <Scroller />
    </>
  );
}
