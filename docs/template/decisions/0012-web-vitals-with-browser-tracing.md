# Web Vitals go to Sentry through browser tracing, named by path

- Status: accepted; page naming superseded by issue #160, which names page views by route with `tanstackRouterBrowserTracingIntegration(router)`
- Date: 2026-11-16

## Context

Step 3 of #158 sends each visit's LCP, CLS and INP to Sentry, in builds with `APP_REACT_SENTRY_DSN` only. `@sentry/react` 11.12.0 offers two ways: `webVitalsIntegration()` on its own, or `browserTracingIntegration()`, which records each page view and adds `webVitalsIntegration()` itself. Sentry's Web Vitals pages table groups by the page view's name. The app is one page today; a fork may add pages.

Each setup below was tested on 2026-11-16 in real Sentry: a Vite preview build with sample rate 1, six visits to two paths, a real click, the page then hidden; read back with the dashboard's own query.

| Setup                                                         | Pages table                                                       | Sentry file (brotli) |
| ------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `browserTracingIntegration()`                                 | one row, "Pageload", for both paths                               | 47.47 kB             |
| `browserTracingIntegration({ beforeStartSpan })`, name = path | one row per path, each with LCP, CLS and INP                      | 47.48 kB             |
| `browserTracingIntegration()`, `traceLifecycle: 'static'`     | one row per path, without CLS                                     | 47.51 kB             |
| `webVitalsIntegration()`                                      | rows "Largest contentful paint", "Layout shift", "Click"; no path | 39.34 kB             |

## Decision

- `Sentry.init` gets `browserTracingIntegration()` with `beforeStartSpan` setting each page view's name to `window.location.pathname`. Sentry 11 sends page views as streamed spans by default, and names every one "Pageload" (`@sentry/browser` 11.12.0, `tracing/browserTracingIntegration.js:268`); the path is only an attribute, which the pages table does not group by.
- `tracesSampleRate` comes from `APP_REACT_SENTRY_TRACES_SAMPLE_RATE`, a number from 0 to 1, default 0.1: the share of visits that report. Comparable apps use 0.02 (Supabase Studio), 0.05 (Outline) and 0.25 (Monkeytype).
- Only the size limit of Sentry's own file rises, to the largest measured build plus 15%. The app's main JS limit stays.

## Rejected

- `browserTracingIntegration()` with Sentry's default names: one pages table row for every page.
- `traceLifecycle: 'static'`, the pre-v11 way of sending page views, which names them by path: CLS did not arrive (why is unchecked), and it changes how every span is sent.
- `webVitalsIntegration()` on its own, about 8 kB smaller: with no page view to belong to, each measurement is named after itself and carries no path. Public use on GitHub: 10 files with `@sentry/react` against 8,816 for `browserTracingIntegration` (2026-11-16).
- Naming the page with `Sentry.getCurrentScope().setTransactionName()` next to `webVitalsIntegration()`: untested, and every page change in a fork would have to update it.
- Google's `web-vitals` library with our own sending code: Sentry already bundles `web-vitals` 6, so the same code would load twice.

## Consequences

- Sentry's own file grows from about 28.5 kB to 47.5 kB on Vite and 49.2 kB on esbuild (brotli, 2026-11-16); its limit is 57 kB. A build without a DSN still ships none of it.
- Sentry also records the timing of `fetch` and XHR requests, and adds its `sentry-trace` and `baggage` headers to requests to the app's own origin only (`@sentry/browser` 11.12.0 `tracing/request.js`, `shouldAttachHeaders`).
- Pages are named by their full path, so `/users/1` and `/users/2` are two rows. An app that adds a router should switch to Sentry's integration for that router, so page names are routes, as Outline does with `reactRouterV5BrowserTracingIntegration`. For this repo that is #160 (TanStack Router).
