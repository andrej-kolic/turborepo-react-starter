/**
 * The todo API's endpoints, one function each. Every function takes the API's base URL first,
 * such as `https://api.example.com` or, in a browser only, `/api`: Node has no page address to resolve a relative one against.
 */

import * as z from 'zod';
import { todoDtoSchema } from './dto';
import { toTodo, type Todo } from './todo';

async function request(
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (!response.ok) {
    throw new Error(
      `${init?.method ?? 'GET'} ${path} failed with HTTP ${response.status}`,
    );
  }
  return response;
}

/**
 * All todos, oldest first.
 * @throws when the request fails or the response is not a list of todos
 */
export async function getTodos(baseUrl: string): Promise<readonly Todo[]> {
  const response = await request(baseUrl, '/todos');
  return z
    .array(todoDtoSchema)
    .parse(await response.json())
    .map(toTodo);
}

/**
 * Adds an open todo.
 * @throws when the request fails or the response is not a todo
 */
export async function createTodo(
  baseUrl: string,
  title: string,
): Promise<Todo> {
  const response = await request(baseUrl, '/todos', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  return toTodo(todoDtoSchema.parse(await response.json()));
}

/**
 * Saves a todo's title and done state.
 * @throws when the request fails, including when no todo has its id, or the response is not a todo
 */
export async function updateTodo(baseUrl: string, todo: Todo): Promise<Todo> {
  const response = await request(
    baseUrl,
    `/todos/${encodeURIComponent(todo.id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ title: todo.title, is_done: todo.done }),
    },
  );
  return toTodo(todoDtoSchema.parse(await response.json()));
}

/**
 * Deletes a todo.
 * @throws when the request fails, including when no todo has the id
 */
export async function deleteTodo(baseUrl: string, id: string): Promise<void> {
  await request(baseUrl, `/todos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
