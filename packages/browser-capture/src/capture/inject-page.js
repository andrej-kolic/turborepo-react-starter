import fs from 'node:fs';

/**
 * Evaluate a script file in the page context (for attach-mode injection).
 *
 * @param {import('playwright-core').Page} page
 * @param {string} scriptPath
 * @returns {Promise<void>}
 */
export async function injectScript(page, scriptPath) {
  const source = fs.readFileSync(scriptPath, 'utf8');
  await page.evaluate(source);
}
