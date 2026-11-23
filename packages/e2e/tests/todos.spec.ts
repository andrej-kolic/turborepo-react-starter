import { expect, test } from '../fixtures/app-target';
import { TodosPage } from '../pages/todos.page';

const SAMPLES = ['Buy milk', 'Water the plants', 'Call the bank'];

test.describe('todo page', () => {
  test('loads the mocked API only once the todo page opens', async ({
    page,
  }) => {
    const todos = new TodosPage(page);
    const mockApiScripts = todos.trackMockApiScripts();

    await page.goto('/');
    // Proving a request never happens needs the page to have finished loading everything it starts with.
    await page.waitForLoadState('networkidle');
    expect(mockApiScripts).toEqual([]);

    await todos.openByLink('Todos');
    await expect(todos.titles).toHaveText(SAMPLES);
    expect(mockApiScripts).toHaveLength(1);
  });

  test('shows the 3 sample todos under "My todos"', async ({ page }) => {
    const todos = new TodosPage(page);
    await todos.goto();

    await expect(todos.heading).toHaveText('My todos');
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
