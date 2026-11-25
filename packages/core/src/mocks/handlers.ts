/**
 * MSW handlers that answer the todo API from an in-memory list, with no browser or Node code,
 * so every environment's setup (`./browser`, `./node`, a later mobile one) shares them.
 * In the browser, everything in this file runs on the page's main thread, beside React: the
 * service worker (`mockServiceWorker.js`) only passes each request here and the reply back to
 * `fetch`. In unit tests it runs in the Node test process. Zustand plays no part.
 * In E2E tests, this code runs in Playwright's process, not in the browser.
 * The list starts with the 3 sample todos. Changes are lost when the page reloads, the process ends
 * or `resetTodos()` is called.
 */

import { Collection } from '@msw/data';
import { http, HttpResponse } from 'msw';
import {
  createTodoDtoSchema,
  todoDtoSchema,
  updateTodoDtoSchema,
  type TodoDto,
} from '../todos/dto';

const SAMPLE_TODOS: readonly TodoDto[] = [
  {
    id: '1',
    title: 'Buy milk',
    is_done: true,
    created_at: '2026-11-20T10:00:00.000Z',
  },
  {
    id: '2',
    title: 'Water the plants',
    is_done: false,
    created_at: '2026-11-20T11:00:00.000Z',
  },
  {
    id: '3',
    title: 'Call the bank',
    is_done: false,
    created_at: '2026-11-20T12:00:00.000Z',
  },
];

// All todos of the fake API. Each one is checked against todoDtoSchema.
const todos = new Collection({ schema: todoDtoSchema });
let lastId = 0;

/**
 * Replaces all todos with `list`, or with the 3 sample todos if you pass no list.
 * Tests call it before each test.
 * @throws when a todo in `list` doesn't match the API's format
 */
export async function resetTodos(
  list: readonly TodoDto[] = SAMPLE_TODOS,
): Promise<void> {
  todos.clear();
  await todos.createMany(list.length, (index) => ({
    // NOTE: index is always below list.length.
    ...list[index]!,
  }));
  // Continue from the highest id, so that a new todo never gets an id that is already used.
  lastId = Math.max(0, ...list.map(({ id }) => Number(id) || 0));
}

const ready = resetTodos();

// The request's JSON body, or undefined when it is not JSON, so the schema check fails and the handler replies 400.
async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** Creates the fake todo API at `baseUrl`. Use the same `baseUrl` as the API functions. */
export function createHandlers(baseUrl: string) {
  return [
    // GET /todos: every todo, oldest first.
    http.get(`${baseUrl}/todos`, async () => {
      // In the browser, the service worker passes each request to this code.
      // Wait until the sample todos are in the list.
      await ready;
      // Read every todo from that list, oldest first, and reply with them as JSON (200).
      // The service worker hands this reply back to the page's fetch.
      return HttpResponse.json(
        todos.findMany(undefined, { orderBy: { created_at: 'asc' } }),
      );
    }),

    // POST /todos {title}: adds a not-done todo with the next id; 201 with it, 400 on a bad body.
    http.post(`${baseUrl}/todos`, async ({ request }) => {
      // In the browser, the service worker passes each request to this code.
      // Wait until the sample todos are in the list.
      await ready;
      // Read the JSON body and check it with Zod: it needs a string title; other keys are dropped.
      const body = createTodoDtoSchema.safeParse(await readJson(request));
      // Bad body, for example no title or not JSON: reply 400 and change nothing.
      if (!body.success) return new HttpResponse(null, { status: 400 });
      // Add the todo to the in-memory list. The mock picks the id, done state and creation time.
      lastId += 1;
      const todo = await todos.create({
        id: String(lastId),
        title: body.data.title,
        is_done: false,
        created_at: new Date().toISOString(),
      });
      // Reply with the new todo (201). The service worker hands this reply back to the page's fetch.
      return HttpResponse.json(todo, { status: 201 });
    }),

    // PATCH /todos/:id {title?, is_done?}: merges the given fields, other keys dropped; 200 with the
    // whole todo, 400 on a bad body, 404 when no todo has the id.
    http.patch<{ id: string }>(
      `${baseUrl}/todos/:id`,
      async ({ params, request }) => {
        // In the browser, the service worker passes each request to this code.
        // Wait until the sample todos are in the list.
        await ready;
        // Read the JSON body and check it with Zod: keep only title and is_done, drop other keys.
        const body = updateTodoDtoSchema.safeParse(await readJson(request));
        // Wrong type, for example is_done: "yes", or not JSON: reply 400 and change nothing.
        if (!body.success) return new HttpResponse(null, { status: 400 });
        // Find the todo with this id in the in-memory list and copy the sent fields onto it.
        // `todo` is the changed todo, or undefined when no todo has this id.
        const todo = await todos.update((q) => q.where({ id: params.id }), {
          data(record) {
            Object.assign(record, body.data);
          },
        });
        // Reply with the changed todo (200), or 404 when there was none.
        // The service worker hands this reply back to the page's fetch.
        return todo
          ? HttpResponse.json(todo)
          : new HttpResponse(null, { status: 404 });
      },
    ),

    // DELETE /todos/:id: removes the todo; 204, or 404 when no todo has the id.
    http.delete<{ id: string }>(`${baseUrl}/todos/:id`, async ({ params }) => {
      // In the browser, the service worker passes each request to this code.
      // Wait until the sample todos are in the list.
      await ready;
      // Remove the todo with this id from the in-memory list.
      // `todo` is the removed todo, or undefined when no todo has this id.
      const todo = todos.delete((q) => q.where({ id: params.id }));
      // Reply 204 with no body, or 404 when there was none.
      // The service worker hands this reply back to the page's fetch.
      return todo
        ? new HttpResponse(null, { status: 204 })
        : new HttpResponse(null, { status: 404 });
    }),
  ];
}
