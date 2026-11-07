/**
 * Pure formatters for page snapshots — no Playwright/CDP dependencies.
 */

/**
 * @typedef {{
 *   testid: string,
 *   tag: string,
 *   role: string | null,
 *   text: string,
 *   visible: boolean,
 * }} TestIdRegion
 */

/**
 * Format data-testid regions as a human-readable bullet list.
 *
 * @param {TestIdRegion[]} testIds
 * @returns {string}
 */
export function formatTestIdRegions(testIds) {
  if (testIds.length === 0) {
    return '(none)';
  }

  return testIds
    .map((region) => {
      const role = region.role ? ` role=${region.role}` : '';
      const visibility = region.visible ? '' : ' hidden';
      const text = region.text ? `: ${JSON.stringify(region.text)}` : '';
      return `- ${region.testid} <${region.tag}>${role}${visibility}${text}`;
    })
    .join('\n');
}

/**
 * Format a page snapshot object as markdown for CLI output.
 *
 * @param {{ title: string, url: string, testIds: TestIdRegion[], ariaYaml: string }} snapshot
 * @returns {string}
 */
export function formatPageSnapshot(snapshot) {
  return [
    '## Page snapshot',
    `url: ${snapshot.url}`,
    `title: ${snapshot.title}`,
    '',
    '### data-testid regions',
    formatTestIdRegions(snapshot.testIds),
    '',
    '### aria snapshot',
    snapshot.ariaYaml || '(empty)',
  ].join('\n');
}
