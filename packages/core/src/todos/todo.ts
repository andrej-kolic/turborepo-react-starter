/** The todo model: what apps hold and render, built from the API's format by `toTodo`. */

import * as z from 'zod';
import type { TodoDto } from './dto';

// z.coerce.date() also reads the ISO string JSON.stringify writes, so a saved query cache can be read back.
export const todoSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    done: z.boolean(),
    createdAt: z.coerce.date(),
  })
  .readonly();

export type Todo = z.infer<typeof todoSchema>;

/** Turns the API's format into the model. */
export function toTodo(dto: TodoDto): Todo {
  return todoSchema.parse({
    id: dto.id,
    title: dto.title,
    done: dto.is_done,
    createdAt: dto.created_at,
  });
}

/** The same todo, checked off when it was open and open when it was checked off. */
export function toggleDone(todo: Todo): Todo {
  return { ...todo, done: !todo.done };
}
