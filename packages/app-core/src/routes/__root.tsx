/** Root route: the layout every page renders inside, and the context the router passes down. */

import React from 'react';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { Header } from '../components/Header';
import { MainNav } from '../components/MainNav';
import { NotFound } from '../components/NotFound';
import { debugLog } from '../utils/debug';

type RouterContext = {
  title: string;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout(): React.JSX.Element {
  const { title } = Route.useRouteContext();
  debugLog();

  return (
    <main className="AppCore">
      <Header title={title} />
      <MainNav />
      <Outlet />
    </main>
  );
}
