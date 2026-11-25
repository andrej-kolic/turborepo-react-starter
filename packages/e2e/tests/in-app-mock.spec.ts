import { expect, test } from '../fixtures/app-target';
import { TodosPage } from '../pages/todos.page';

// @in-app-mock: runs only on a build with APP_REACT_API_URL="mock", and no other test does; see docs/template/e2e.md.
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
