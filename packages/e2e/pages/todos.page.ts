/**
 * Shared helper for the E2E tests of the todo and settings pages: finds their parts and does what a test needs
 * (open a page by its link, add, check off or delete a todo, change a setting).
 *
 * Used by `tests/todos.spec.ts`, `tests/mocked-api.spec.ts` and `tests/in-app-mock.spec.ts`.
 */

import type { Locator, Page, Response } from '@playwright/test';

export class TodosPage {
  readonly page: Page;
  readonly todosPage: Locator;
  readonly settingsPage: Locator;
  readonly heading: Locator;
  /** Each todo's title, in list order. */
  readonly titles: Locator;
  readonly newTodo: Locator;

  constructor(page: Page) {
    this.page = page;
    this.todosPage = page.getByTestId('todos-page');
    this.settingsPage = page.getByTestId('settings-page');
    this.heading = this.todosPage.getByRole('heading', { level: 1 });
    this.titles = this.todosPage.getByRole('listitem').locator('label');
    this.newTodo = this.todosPage.getByRole('textbox', { name: 'New todo' });
  }

  goto(): Promise<Response | null> {
    return this.page.goto('/todos');
  }

  /** Follows a link in the main navigation, as a visitor would: the page doesn't reload. */
  async openByLink(name: 'Todos' | 'Settings' | 'About'): Promise<void> {
    await this.page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name })
      .click();
  }

  checkbox(title: string): Locator {
    return this.todosPage.getByRole('checkbox', { name: title });
  }

  /** Clicks a todo's checkbox. It shows the new state once the list reloads, so assert with `toBeChecked`. */
  async toggle(title: string): Promise<void> {
    await this.checkbox(title).click();
  }

  async add(title: string): Promise<void> {
    await this.newTodo.fill(title);
    await this.todosPage.getByRole('button', { name: 'Add' }).click();
  }

  async remove(title: string): Promise<void> {
    await this.todosPage
      .getByRole('button', { name: `Delete ${title}` })
      .click();
  }

  async setUsername(username: string): Promise<void> {
    await this.settingsPage
      .getByRole('textbox', { name: 'Username' })
      .fill(username);
  }

  async setHideCompleted(hide: boolean): Promise<void> {
    await this.settingsPage
      .getByRole('checkbox', { name: 'Hide completed todos' })
      .setChecked(hide);
  }
}
