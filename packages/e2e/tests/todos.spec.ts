import { resetTodos } from '@repo/core/mocks/handlers';
import { http, HttpResponse } from 'msw';
import { expect, test } from '../fixtures/app-target';
import { API_URL } from '../lib/api-url';
import { AppPage } from '../pages/app.page';
import { TodosPage } from '../pages/todos.page';

const SAMPLES = ['Buy milk', 'Water the plants', 'Call the bank'];

test.describe('todo page', () => {
  test('shows the 3 sample todos under "My todos"', async ({ page }) => {
    const todos = new TodosPage(page);
    await todos.goto();

    await expect(todos.heading).toHaveText('My todos');
    await expect(todos.titles).toHaveText(SAMPLES);
  });

  test('shows no todos when the API has none', async ({ page }) => {
    await resetTodos([]);
    const todos = new TodosPage(page);
    await todos.goto();

    await expect(todos.newTodo).toBeVisible();
    await expect(todos.titles).toHaveCount(0);
  });

  test('shows the route error screen when the API fails, and the todos on Try again', async ({
    page,
    network,
  }) => {
    network.use(
      http.get(
        `${API_URL}/todos`,
        () => new HttpResponse(null, { status: 500 }),
        { once: true },
      ),
    );
    const appPage = new AppPage(page);
    const todos = new TodosPage(page);
    await todos.goto();
    await expect(appPage.routeError).toContainText('Something went wrong');

    await appPage.tryAgain();
    await expect(todos.titles).toHaveText(SAMPLES);
  });

  test('keeps an added todo after navigating away and back', async ({
    page,
  }) => {
    const todos = new TodosPage(page);
    await todos.goto();

    await todos.add('Book flights');
    await expect(todos.titles).toHaveText([...SAMPLES, 'Book flights']);

    await todos.openByLink('About');
    await todos.openByLink('Todos');
    await expect(todos.titles).toHaveText([...SAMPLES, 'Book flights']);
  });

  test('clears the field after adding a todo', async ({ page }) => {
    const todos = new TodosPage(page);
    await todos.goto();

    await todos.add('Book flights');

    await expect(todos.titles).toHaveText([...SAMPLES, 'Book flights']);
    await expect(todos.newTodo).toHaveValue('');
  });

  test('refuses a title of only spaces', async ({ page }) => {
    const todos = new TodosPage(page);
    await todos.goto();

    await todos.add('   ');

    expect(
      await todos.newTodo.evaluate((input: HTMLInputElement) =>
        input.checkValidity(),
      ),
    ).toBe(false);
    await expect(todos.titles).toHaveText(SAMPLES);
  });

  test('keeps a checked-off todo after navigating away and back', async ({
    page,
  }) => {
    const todos = new TodosPage(page);
    await todos.goto();

    await todos.toggle('Water the plants');
    await expect(todos.checkbox('Water the plants')).toBeChecked();

    await todos.openByLink('About');
    await todos.openByLink('Todos');
    await expect(todos.checkbox('Water the plants')).toBeChecked();
  });

  test('keeps a deleted todo gone after navigating away and back', async ({
    page,
  }) => {
    const todos = new TodosPage(page);
    await todos.goto();

    await todos.remove('Call the bank');
    await expect(todos.titles).toHaveText(['Buy milk', 'Water the plants']);

    await todos.openByLink('About');
    await todos.openByLink('Todos');
    await expect(todos.titles).toHaveText(['Buy milk', 'Water the plants']);
  });

  test('hides completed todos while that setting is on', async ({ page }) => {
    const todos = new TodosPage(page);
    await todos.goto();
    await expect(todos.titles).toHaveText(SAMPLES);

    await todos.openByLink('Settings');
    await todos.setHideCompleted(true);
    await todos.openByLink('Todos');

    await expect(todos.titles).toHaveText([
      'Water the plants',
      'Call the bank',
    ]);
  });

  test('shows the username set on the settings page in the heading', async ({
    page,
  }) => {
    const todos = new TodosPage(page);
    await todos.goto();

    await todos.openByLink('Settings');
    await todos.setUsername('Ana');
    await todos.openByLink('Todos');

    await expect(todos.heading).toHaveText("Ana's todos");
  });
});
