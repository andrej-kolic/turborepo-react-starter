# Add a route

Pages are [TanStack Router](https://tanstack.com/router) file-based routes in [`packages/app-core/src/routes/`](../../packages/app-core/src/routes/). The router CLI (`tsr`) turns that folder into `packages/app-core/src/routeTree.gen.ts`, which is committed; the bundler apps don't know routes exist. Why this setup: [0015](decisions/0015-file-based-routing.md).

## Add a page

1. Create two files in `src/routes/`. The file name is the path: `contact.tsx` is `/contact`, `demo/asset-imports.tsx` is `/demo/asset-imports`, `index.tsx` is `/`.

   ```tsx
   // contact.tsx: in the main bundle; route options only, no component
   import { createFileRoute } from '@tanstack/react-router';

   export const Route = createFileRoute('/contact')();
   ```

   ```tsx
   // contact.lazy.tsx: loads in its own file when the page opens
   import React from 'react';
   import { createLazyFileRoute } from '@tanstack/react-router';

   export const Route = createLazyFileRoute('/contact')({
     component: ContactPage,
   });

   function ContactPage(): React.JSX.Element {
     return (
       <section aria-label="Contact" data-testid="contact-page">
         <h1>Contact</h1>
       </section>
     );
   }
   ```

2. Regenerate the route tree. `pnpm dev:app` does it on every save; without the dev server, run:

   ```bash
   pnpm --filter @repo/app-core generate:routes
   ```

   Commit `routeTree.gen.ts` with the route. `Verify: Code` fails when the committed file differs from a fresh one.

3. Link to it with `<Link to="/contact">`; the menu is [`components/MainNav`](../../packages/app-core/src/components/MainNav/index.tsx). A link to a path that doesn't exist fails `pnpm check:type`.

4. Add the page's `data-testid` to `PAGES` in [`packages/dev-tools/config/page-split-check.ts`](../../packages/dev-tools/config/page-split-check.ts) and to the [test ID registry](component-validation-contract.md#registry). `pnpm check:page-split` then fails if the page's component ever lands in the main bundle.

## What goes in which file

Automatic code splitting needs TanStack's bundler plugin, which this repo doesn't use, so each page is split by hand:

| File               | Holds                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `contact.tsx`      | Anything needed before the page renders: `loader`, `beforeLoad`, `validateSearch`           |
| `contact.lazy.tsx` | Everything rendered: `component`, `errorComponent`, `pendingComponent`, `notFoundComponent` |

Never import from a `.lazy.tsx` file: that pulls the page into the main bundle. In the lazy file, read the route's typed data with `getRouteApi`, not by importing `Route` from `contact.tsx`:

```tsx
import { getRouteApi } from '@tanstack/react-router';

const route = getRouteApi('/contact');
// inside the component:
const search = route.useSearch();
```

## Errors and unknown paths

A page that throws shows [`RouteError`](../../packages/app-core/src/components/RouteError/index.tsx) in its place, with the header and menu still there; a route's own `errorComponent` replaces it. A path no route matches shows [`NotFound`](../../packages/app-core/src/components/NotFound/index.tsx). Only errors outside the router reach `AppErrorBoundary`.

## Serving deep links

Every dev server, preview server, Netlify and CloudFront serves `index.html` for a path with no file, so opening or reloading `/contact` works. Two limits:

- **The app must be served from the domain root.** Asset URLs are absolute (`/assets/…`), so `example.com/` works and `example.com/app/` doesn't. Public files in `packages/app-core/public/` need absolute paths too: `/images/pic.svg`, not `images/pic.svg`.
- **A path whose last part has a dot is a file on CloudFront.** `/users/jane.doe` gets a 404 there, not the app. Its rewrite function is in [`infra/aws/templates/cloudfront-site.yaml`](../../infra/aws/templates/cloudfront-site.yaml).
