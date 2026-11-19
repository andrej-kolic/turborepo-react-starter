/**
 * The app's single router, built from the generated route tree. `AppCore` renders it;
 * `Register` makes every `Link`, `navigate` and hook type-check against these routes.
 */

import { createRouter, type RouterHistory } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { RouteError } from './components/RouteError';

/**
 * Builds a router with the app's routes and settings. Tests pass a memory history;
 * the app uses `router`, on the browser's history.
 */
export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    defaultErrorComponent: RouteError,
    // AppCore passes the real title through RouterProvider's context prop.
    context: { title: '' },
  });
}

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- module augmentation needs an interface to merge into
  interface Register {
    router: typeof router;
  }
}
