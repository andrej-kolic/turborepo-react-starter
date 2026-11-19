/**
 * The app's single router, built from the generated route tree. `AppCore` renders it;
 * `Register` makes every `Link`, `navigate` and hook type-check against these routes.
 */

import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { RouteError } from './components/RouteError';

export const router = createRouter({
  routeTree,
  defaultErrorComponent: RouteError,
  // AppCore passes the real title through RouterProvider's context prop.
  context: { title: '' },
});

declare module '@tanstack/react-router' {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- module augmentation needs an interface to merge into
  interface Register {
    router: typeof router;
  }
}
