import { expect, test } from '../fixtures/app-target';
import { TodosPage } from '../pages/todos.page';

// This test checks the fake API built into the app. It runs only with `APP_REACT_API_URL=mock pnpm e2e`.
test(
  'shows the 3 sample todos from the mock inside the app',
  { tag: '@in-app-mock' },
  async ({ page }) => {
    const todos = new TodosPage(page);
    await todos.goto();

    await expect(todos.titles).toHaveText([
      'Buy milk',
      'Water the plants',
      'Call the bank',
    ]);
  },
);
