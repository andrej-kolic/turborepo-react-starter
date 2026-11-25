# E2E tests answer the API themselves, with the mock from `@repo/core`

- Status: accepted
- Date: 2026-11-25

## Context

The E2E tests used the mock inside the app (`APP_REACT_API_URL="mock"`), so they ran on a build a real app never deploys, and no test could change a reply or the todos (#205). The template has no real API.

## Decision

- [`@msw/playwright`](https://github.com/mswjs/playwright) answers the app's API requests in every test with `createHandlers` from `@repo/core`, as [crates.io](https://github.com/rust-lang/crates.io/blob/d217167aff/e2e/helper.ts) does. A test sets its own todos with `resetTodos(list)`, or one reply with `network.use(...)`.
- Playwright builds the app with a placeholder URL, so no mock ships in that build. The shell's `APP_REACT_API_URL` wins, and the tests answer that address instead.
- A last handler for the whole API address fails the test on a request the mock doesn't know. It needs `skipAssetRequests: false`: otherwise an address like `/todos.json` skips the handlers.
- `APP_REACT_API_URL=mock pnpm e2e` runs only the `@in-app-mock` test, on a build with the mock inside, because the dev server and demo site use it. It is a separate run: Playwright starts one app server per config.
- CI checks size and env guards on the build the env files give, as before, then does both E2E runs. Each builds again: Turbo caches per `APP_REACT_API_URL` value, and the checked build has it only in `.env`.
- Tests on a real API are a guide ([e2e.md](../e2e.md#test-on-a-real-api)), not code.

## Rejected

- `onUnhandledFrame: 'error'`, `@msw/playwright`'s own setting for unknown requests: it also blocks the app's page and files, and every test fails (`net::ERR_FAILED`, tried on 2026-11-25).
- Real-API tests and a daily mock check, shipped switched off: they can't run here, so they could break unnoticed. A keyword search found neither in 15 starters (2026-11-25). The API functions already check each todo they receive, so a real-API test catches a changed format.
- A small API server in the repo, as [bartstc's template](https://github.com/bartstc/vite-ts-react-template/blob/4682b516af/docs/e2e-testing.md#23-mock-only-the-outside-world) has, which never mocks its own API in E2E: a second fake to maintain.

## Consequences

- The tests don't prove login cookies, CORS, proxies, or that the mock matches the API; a project with an API adds a few real-API tests.
- Each CI build job builds its app three times.
- With `TARGET_URL`, the tests must be told the running build's `APP_REACT_API_URL`.
