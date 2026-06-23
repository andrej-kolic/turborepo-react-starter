import fs from 'node:fs';

/**
 * @param {import('playwright-core').Page} page
 * @param {string} scriptPath
 */
export async function injectScript(page, scriptPath) {
  const source = fs.readFileSync(scriptPath, 'utf8');
  await page.evaluate(source);
}
