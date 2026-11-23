import { describe, expect, it } from 'vitest';
import { todoSchema, toggleDone, toTodo } from '../todos/todo';

const DTO = {
  id: '1',
  title: 'Buy milk',
  is_done: true,
  created_at: '2026-11-20T10:00:00.000Z',
};

describe('toTodo', () => {
  it('renames the fields and reads the date', () => {
    expect(toTodo(DTO)).toEqual({
      id: '1',
      title: 'Buy milk',
      done: true,
      createdAt: new Date('2026-11-20T10:00:00.000Z'),
    });
  });
});

describe('todoSchema', () => {
  it('reads back a todo saved as JSON, date included', () => {
    const todo = toTodo(DTO);

    expect(todoSchema.parse(JSON.parse(JSON.stringify(todo)))).toEqual(todo);
  });
});

describe('toggleDone', () => {
  it('flips done and leaves the original unchanged', () => {
    const todo = toTodo(DTO);

    expect(toggleDone(todo)).toEqual({ ...todo, done: false });
    expect(todo.done).toBe(true);
  });
});
