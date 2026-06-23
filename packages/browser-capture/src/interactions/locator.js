/**
 * Map a recorded interaction element to a Playwright locator expression string.
 *
 * @param {object} interaction
 * @returns {string | null}
 */
export function interactionToLocator(interaction) {
  const el = interaction.element;
  if (!el) return null;

  if (el.testId) return `page.getByTestId(${JSON.stringify(el.testId)})`;
  if (el.ariaLabel) return `page.getByLabel(${JSON.stringify(el.ariaLabel)})`;
  if (el.id) return `page.locator(${JSON.stringify('#' + el.id)})`;
  if (el.role && el.text) {
    return `page.getByRole(${JSON.stringify(el.role)}, { name: ${JSON.stringify(el.text)} })`;
  }
  if (el.name)
    return `page.locator(${JSON.stringify('[name="' + el.name + '"]')})`;
  if (el.text) return `page.getByText(${JSON.stringify(el.text)})`;
  return `page.locator(${JSON.stringify(el.tag || 'div')})`;
}
