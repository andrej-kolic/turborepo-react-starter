# Playwright E2E

How to run and extend the Playwright regression tests for `@repo/web`. Why they run on the preview build: [`decisions/0003-e2e-on-preview-build.md`](decisions/0003-e2e-on-preview-build.md).

## Run locally

```bash
unset TARGET_URL                            # a leftover dev URL would send E2E to the dev server
pnpm --filter @repo/e2e install:browsers    # first run only
pnpm e2e                                    # the bare profile; add --ui or --headed
BUILD_PROFILE=features pnpm e2e             # the features profile
```

`pnpm e2e` builds the app named by `BUNDLER` in `.env` with a placeholder API address, starts its preview, runs the tests and stops the preview. `BUILD_PROFILE` sets the [build profile](build-profiles.md) for both the build and the tests; without it, the profile is `bare`. It fails if a preview of that app is already running: that one may be another profile's build. Extra flags go to Playwright.

The tests answer the app's requests to the todo API themselves, with the mock from `@repo/core`: [0021](decisions/0021-e2e-mocks-the-api.md). The app's own mock, which the dev server and demo site use, has one test, on a build of its own:

```bash
APP_REACT_API_URL=mock pnpm e2e             # runs only the @in-app-mock test
```

No test sends anything to Sentry: `features` builds with a fake DSN, and `packages/e2e/fixtures/app-target.ts` answers every request to Sentry inside the test browser, also on a preview built with your DSN.

## Run against another bundler

```bash
unset TARGET_URL
BUNDLER=web-rspack pnpm e2e
```

## Run against a preview that is already up

```bash
BUILD_PROFILE=bare APP_REACT_API_URL=https://api.example.test pnpm preview:app   # the build the tests expect
TARGET_URL=http://localhost:<previewPort> pnpm e2e                               # in another terminal
```

A plain `pnpm preview:app` has the mock inside, unless your `.env.local` sets an API address, so on that one run `APP_REACT_API_URL=mock pnpm e2e` with the `TARGET_URL`.

With `TARGET_URL`, E2E builds and starts nothing, and tests whatever runs there: for a `features` build, add `BUILD_PROFILE=features`, and for a build with another API address than the placeholder in `packages/e2e/lib/api-url.ts`, add that build's `APP_REACT_API_URL`. `previewPort` is in `apps/<BUNDLER>/package.json`; URL rules are in [`docs/template/app-url.md`](app-url.md).

## Add a test

1. Assert page regions with `getByTestId`, using values from the [registry](component-validation-contract.md#registry). Use `getByRole` and `getByText` for user flows (clicks, forms, navigation).
2. Put page selectors and actions in a page class under `packages/e2e/pages/` (like `app.page.ts`).
3. Write the spec in `packages/e2e/tests/`, using the `test` fixture from `packages/e2e/fixtures/app-target.ts`; `pnpm lint` fails on a test that imports `test` from Playwright instead, since that test could send to Sentry or the API. A test that needs an optional feature, such as Sentry, gets `{ tag: '@features' }`, as `tests/web-vitals.spec.ts` does; it then runs only on the `features` build.
4. Every test starts from the 3 sample todos, and fails if the app asks the API for something the mock doesn't know. To set other data, before the page opens:

   ```ts
   import { resetTodos } from '@repo/core/mocks/handlers';

   await resetTodos([]); // no todos; or a list of them, in the API's format

   // Replaces this address's replies for the whole test; add `{ once: true }` as the third
   // argument to replace only the first (`network` is a fixture).
   network.use(
     http.get(
       `${API_URL}/todos`,
       () => new HttpResponse(null, { status: 500 }),
     ),
   );
   ```

   [`tests/todos.spec.ts`](../../packages/e2e/tests/todos.spec.ts) does both.

## Test on a real API

The template ships no such tests: it has no real API. The mock can't prove that login cookies, CORS (the API letting the app's address call it) and proxies work, or that it still matches the API. Once your project has an API, add a few tests on it:

1. Cover only the most important user paths. Leave every other case, such as errors and empty lists, to the mocked tests.
2. Use an API copy only tests use, or a staging one whose data you control, never production ([why](https://martinfowler.com/articles/practical-test-pyramid.html)).
3. Give them their own fixture: the one in `app-target.ts` answers every API request.
4. Create each test's data with Playwright's [`request` fixture](https://playwright.dev/docs/api-testing), and delete it afterwards, so tests can run in any order.
5. Run them after a merge or daily, so an API outage doesn't block pull requests.

The API functions in `@repo/core` check every todo they receive, so a renamed field fails these tests. A rule that differs, such as a title only the API refuses, can stay hidden. If the API has an OpenAPI spec, typing the handlers from it, as [crates.io does](https://github.com/rust-lang/crates.io/blob/d217167aff/packages/crates-io-msw/utils/openapi-http.ts), catches a mock that no longer matches.

## What CI runs

[`.github/workflows/verify-build.yml`](../../.github/workflows/verify-build.yml) runs the full suite and the `@in-app-mock` test on every bundler, once per build profile, in jobs named `Build + E2E (<bundler>, <profile>)`. [`.github/workflows/verify-dev.yml`](../../.github/workflows/verify-dev.yml) runs the `@smoke` test on every bundler's dev server, in jobs named `E2E smoke test (<bundler>)`. Both use the Playwright container that matches the catalog version, and upload the report and traces on failure.

The GitHub repo variable `DEFAULT_BUNDLER` (`web-vite`, `web-rspack` or `web-esbuild`) doesn't affect E2E: it picks the app that the deploy and trace workflows use by default.
