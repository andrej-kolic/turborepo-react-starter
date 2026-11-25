# Add a feature to `@repo/core`

[`packages/core`](../../packages/core) holds the logic every client shares: API functions, models, stores and the mocked API. Pages and React hooks stay in [`packages/web`](../../packages/web). Why: [0019](decisions/0019-shared-core-package.md). The todo feature is the example below; copy its files for a new one.

## What may go in `core`

| Allowed                                      | Not allowed                                    | Caught by         |
| -------------------------------------------- | ---------------------------------------------- | ----------------- |
| `fetch`, `Request`, `Response`, Zod, Zustand | `window`, `document`, `process`, `fs`, React   | `pnpm check:type` |
| Config passed in: base URL, storage          | `self`, `caches`, `postMessage`, `indexedDB`   | `pnpm lint`       |
| Plain functions on read-only models          | `import.meta.env`, classes, exported DTO types | review            |

## Add an API resource

1. **DTO schema** in `src/<feature>/dto.ts`: the API's JSON as a Zod object, no `.transform`, plus request-body schemas picked from it. Example: [`todos/dto.ts`](../../packages/core/src/todos/dto.ts).

2. **Model** in `src/<feature>/<name>.ts`: a Zod schema ending in `.readonly()`, its type, a `to…()` function from the DTO, and plain functions that return a changed copy. Dates use `z.coerce.date()`. Example: [`todos/todo.ts`](../../packages/core/src/todos/todo.ts).

   ```
   { id: "1", title: "Buy milk", is_done: true, created_at: "2026-11-20T10:00:00.000Z" }
   → { id: "1", title: "Buy milk", done: true, createdAt: Date }
   ```

3. **API functions** in `src/<feature>/api.ts`: one per endpoint, base URL first, each response parsed with the DTO schema and turned into the model. Example: [`todos/api.ts`](../../packages/core/src/todos/api.ts).

4. **Export** the functions and the model type from [`src/index.ts`](../../packages/core/src/index.ts), never the DTO.

5. **Mocked API**: add handlers for the endpoints to `createHandlers(baseUrl)` in [`mocks/handlers.ts`](../../packages/core/src/mocks/handlers.ts), storing records in an `@msw/data` collection made from the DTO schema. Reply 400 to a body the schema rejects, 404 to an unknown id. The E2E tests use the same handlers, so also reset the new records in `network` in [`fixtures/app-target.ts`](../../packages/e2e/fixtures/app-target.ts).

6. **Unit tests** in `src/__test__/`, against `createServer('http://localhost/api')` from `mocks/node`, resetting the mock's data before each test. Example: [`__test__/api.test.ts`](../../packages/core/src/__test__/api.test.ts).

   ```bash
   pnpm --filter @repo/core test
   ```

## Add a store

Make it with `createStore` from `zustand/vanilla`, taking its storage as an argument, typed as Zustand's `StateStorage`. Check saved values with a Zod schema in `persist`'s `merge`, so a wrong type keeps the default. Example: [`settings/store.ts`](../../packages/core/src/settings/store.ts). The app creates it once with its storage, as [`packages/web/src/settings.ts`](../../packages/web/src/settings.ts) does with `localStorage`.

## Use it in the web app

1. Pass `apiBaseUrl` from [`packages/web/src/api.ts`](../../packages/web/src/api.ts) to every API function.
2. In the page's route loader (`routes/<page>.tsx`), as [`routes/todos.tsx`](../../packages/web/src/routes/todos.tsx) does, load `core` with `import('@repo/core')` inside the loader, never an import at the top of the file. The route file is in the main bundle, which every visitor downloads before any page shows; `import()` puts `core` and Zod in a separate file, downloaded only when the page opens.
3. In the `.lazy.tsx` component, import from `@repo/core` normally. Adding the page itself: [routing.md](routing.md).
