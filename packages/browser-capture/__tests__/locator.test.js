import { describe, expect, it } from 'vitest';
import { interactionToLocator } from '../src/interactions/locator.js';

describe('interactionToLocator', () => {
  it('prefers data-testid over other selectors', () => {
    expect(
      interactionToLocator({
        element: {
          testId: 'submit-btn',
          ariaLabel: 'Submit',
          id: 'submit',
          role: 'button',
          text: 'Submit',
        },
      }),
    ).toBe('page.getByTestId("submit-btn")');
  });

  it('uses aria-label when testId is absent', () => {
    expect(
      interactionToLocator({
        element: { ariaLabel: 'Close dialog', id: 'close' },
      }),
    ).toBe('page.getByLabel("Close dialog")');
  });

  it('uses id when testId and aria-label are absent', () => {
    expect(
      interactionToLocator({
        element: { id: 'email', name: 'email' },
      }),
    ).toBe('page.locator("#email")');
  });

  it('uses role and text when higher-priority selectors are absent', () => {
    expect(
      interactionToLocator({
        element: { role: 'button', text: 'Save changes' },
      }),
    ).toBe('page.getByRole("button", { name: "Save changes" })');
  });

  it('uses name attribute before visible text', () => {
    expect(
      interactionToLocator({
        element: { name: 'username', text: 'Username' },
      }),
    ).toBe('page.locator("[name=\\"username\\"]")');
  });

  it('falls back to visible text', () => {
    expect(
      interactionToLocator({
        element: { text: 'Continue' },
      }),
    ).toBe('page.getByText("Continue")');
  });

  it('falls back to tag name', () => {
    expect(
      interactionToLocator({
        element: { tag: 'section' },
      }),
    ).toBe('page.locator("section")');
  });

  it('returns null when element is missing', () => {
    expect(interactionToLocator({})).toBe(null);
  });
});
