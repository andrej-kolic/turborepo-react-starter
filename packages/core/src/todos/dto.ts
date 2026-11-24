/**
 * The todo API's JSON format, checked on every response. Used by `api.ts` and by the mocked API;
 * not exported from the package: callers get `Todo` models.
 */

import * as z from 'zod';

// No .transform: it runs on every check, and the mock (@msw/data) checks each todo as it saves it,
// so the mock would store and send the app's shape instead of the server's.
export const todoDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  is_done: z.boolean(),
  created_at: z.iso.datetime(),
});

export type TodoDto = z.infer<typeof todoDtoSchema>;

/** Body of `POST /todos`. */
export const createTodoDtoSchema = todoDtoSchema.pick({ title: true });

/** Body of `PATCH /todos/:id`. */
export const updateTodoDtoSchema = todoDtoSchema
  .pick({ title: true, is_done: true })
  .partial();
