/**
 * Todo page (`/todos`): adds, checks off and deletes todos through the todo API, and reloads the list after
 * each change. Hides completed todos while that setting is on.
 */

import React, { useActionState, useTransition } from 'react';
import { createLazyFileRoute, useRouter } from '@tanstack/react-router';
import {
  createTodo,
  deleteTodo,
  toggleDone,
  updateTodo,
  type Todo,
} from '@repo/core';
import { apiBaseUrl } from '../api';
import { useSettings } from '../settings';

export const Route = createLazyFileRoute('/todos')({
  component: TodosPage,
});

function TodosPage(): React.JSX.Element {
  const todos = Route.useLoaderData();
  const router = useRouter();
  const username = useSettings((state) => state.username);
  const hideCompleted = useSettings((state) => state.hideCompleted);
  const [isSaving, startSaving] = useTransition();

  const [, addTodo, isAdding] = useActionState(
    async (_previous: null, formData: FormData) => {
      const title = formData.get('title');
      if (typeof title === 'string' && title.trim()) {
        await createTodo(apiBaseUrl, title.trim());
        await router.invalidate();
      }
      return null;
    },
    null,
  );

  function save(change: () => Promise<unknown>) {
    startSaving(async () => {
      await change();
      await router.invalidate();
    });
  }

  const shown = hideCompleted ? todos.filter((todo) => !todo.done) : todos;

  return (
    <section className="TodosPage" aria-label="Todos" data-testid="todos-page">
      <h1>{username ? `${username}'s todos` : 'My todos'}</h1>
      <form action={addTodo}>
        {/* pattern: a title of only spaces is refused like an empty one. */}
        <input name="title" aria-label="New todo" required pattern=".*\S.*" />
        <button type="submit" disabled={isAdding}>
          Add
        </button>
      </form>
      <ul>
        {shown.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            disabled={isSaving}
            onToggle={() =>
              save(() => updateTodo(apiBaseUrl, toggleDone(todo)))
            }
            onDelete={() => save(() => deleteTodo(apiBaseUrl, todo.id))}
          />
        ))}
      </ul>
    </section>
  );
}

type TodoItemProps = {
  todo: Todo;
  disabled: boolean;
  onToggle: () => void;
  onDelete: () => void;
};

function TodoItem({
  todo,
  disabled,
  onToggle,
  onDelete,
}: TodoItemProps): React.JSX.Element {
  return (
    <li>
      <label>
        <input
          type="checkbox"
          checked={todo.done}
          disabled={disabled}
          onChange={onToggle}
        />
        {todo.title}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        aria-label={`Delete ${todo.title}`}
      >
        Delete
      </button>
    </li>
  );
}
