import { http, HttpResponse } from 'msw';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { resetTodos } from '../mocks/handlers';
import { createServer } from '../mocks/msw-node';
import { createTodo, deleteTodo, getTodos, updateTodo } from '../todos/api';
import { toggleDone } from '../todos/todo';

const BASE_URL = 'http://localhost/api';
const server = createServer(BASE_URL);

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetTodos());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('getTodos', () => {
  it('returns the 3 sample todos as models, oldest first', async () => {
    const todos = await getTodos(BASE_URL);

    expect(todos.map(({ title }) => title)).toEqual([
      'Buy milk',
      'Water the plants',
      'Call the bank',
    ]);
    expect(todos[0]).toEqual({
      id: '1',
      title: 'Buy milk',
      done: true,
      createdAt: new Date('2026-11-20T10:00:00.000Z'),
    });
  });

  it('rejects a response that is not a list of todos', async () => {
    server.use(
      http.get(`${BASE_URL}/todos`, () =>
        HttpResponse.json([{ id: 1, title: 'Buy milk' }]),
      ),
    );

    await expect(getTodos(BASE_URL)).rejects.toThrow(/is_done/);
  });

  it('rejects a failed request with its status', async () => {
    server.use(
      http.get(
        `${BASE_URL}/todos`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    await expect(getTodos(BASE_URL)).rejects.toThrow(
      'GET /todos failed with HTTP 500',
    );
  });
});

describe('createTodo', () => {
  it('returns an open todo that the next list includes', async () => {
    const todo = await createTodo(BASE_URL, 'Book flights');

    expect(todo).toMatchObject({ title: 'Book flights', done: false });
    expect(todo.createdAt).toBeInstanceOf(Date);
    expect(await getTodos(BASE_URL)).toContainEqual(todo);
  });

  it('gives each new todo its own id', async () => {
    const first = await createTodo(BASE_URL, 'Book flights');
    const second = await createTodo(BASE_URL, 'Pack');

    expect(first.id).not.toBe(second.id);
  });
});

describe('updateTodo', () => {
  it('saves the done state, which the next list shows', async () => {
    const [, plants] = await getTodos(BASE_URL);
    if (!plants) throw new Error('missing sample todo');

    const updated = await updateTodo(BASE_URL, toggleDone(plants));

    expect(updated).toEqual({ ...plants, done: true });
    expect((await getTodos(BASE_URL))[1]).toEqual(updated);
  });

  it('rejects an id that no todo has', async () => {
    const [milk] = await getTodos(BASE_URL);
    if (!milk) throw new Error('missing sample todo');

    await expect(updateTodo(BASE_URL, { ...milk, id: '99' })).rejects.toThrow(
      'PATCH /todos/99 failed with HTTP 404',
    );
  });
});

describe('deleteTodo', () => {
  it('removes the todo from the next list', async () => {
    await deleteTodo(BASE_URL, '2');

    expect((await getTodos(BASE_URL)).map(({ id }) => id)).toEqual(['1', '3']);
  });

  it('rejects an id that no todo has', async () => {
    await expect(deleteTodo(BASE_URL, '99')).rejects.toThrow(
      'DELETE /todos/99 failed with HTTP 404',
    );
  });

  it('sends an id with a slash as one path segment', async () => {
    await expect(deleteTodo(BASE_URL, 'a/b')).rejects.toThrow(
      'DELETE /todos/a%2Fb failed with HTTP 404',
    );
  });
});

describe('mocked API', () => {
  it('replies 400 to a POST body that is not JSON', async () => {
    const response = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      body: 'not json',
    });

    expect(response.status).toBe(400);
  });

  it('replies 400 to a PATCH body that is not JSON', async () => {
    const response = await fetch(`${BASE_URL}/todos/1`, {
      method: 'PATCH',
      body: 'not json',
    });

    expect(response.status).toBe(400);
  });
});

describe('resetTodos', () => {
  it('brings back the 3 samples after changes', async () => {
    await deleteTodo(BASE_URL, '1');
    await createTodo(BASE_URL, 'Book flights');

    await resetTodos();

    expect((await getTodos(BASE_URL)).map(({ id }) => id)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('replaces the samples with the given todos, and adds new ones after them', async () => {
    await resetTodos([
      {
        id: '7',
        title: 'Book flights',
        is_done: true,
        created_at: '2026-11-20T10:00:00.000Z',
      },
    ]);
    await createTodo(BASE_URL, 'Pack');

    expect(
      (await getTodos(BASE_URL)).map(({ id, title }) => [id, title]),
    ).toEqual([
      ['7', 'Book flights'],
      ['8', 'Pack'],
    ]);
  });

  it('leaves no todos when given an empty list', async () => {
    await resetTodos([]);

    expect(await getTodos(BASE_URL)).toEqual([]);
  });

  it("rejects a todo that does not match the API's format", async () => {
    await expect(
      resetTodos([
        { id: '1', title: 'Pack', is_done: false, created_at: 'yesterday' },
      ]),
    ).rejects.toThrow('Failed to execute "createMany"');
  });
});
