/**
 * Logic shared by every client: the todo API, its model and the settings store.
 * Plain TypeScript with no React, DOM or Node APIs, so a web app, mobile app, CLI or MCP server can use it.
 */

export { createTodo, deleteTodo, getTodos, updateTodo } from './todos/api';
export { toggleDone, type Todo } from './todos/todo';
export {
  createSettingsStore,
  type Settings,
  type SettingsState,
} from './settings/store';
