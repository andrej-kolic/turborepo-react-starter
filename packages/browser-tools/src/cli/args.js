/**
 * Pure CLI argument helpers — kept separate from bin/ so they can be unit-tested
 * without Chrome/CDP (same pattern as Playwright and other CLI tools).
 */

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isTruthyFlag(value) {
  return value === true || value === 'true' || value === '1';
}

/**
 * @param {string[]} argv
 * @returns {{ positionals: string[], options: Record<string, string | boolean> }}
 */
export function parseArgs(argv) {
  const positionals = [];
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const withoutPrefix = arg.slice(2);
    const [key, inlineValue] = withoutPrefix.split('=', 2);
    if (inlineValue !== undefined) {
      options[key] = inlineValue;
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      options[key] = next;
      i++;
    } else {
      options[key] = true;
    }
  }
  return { positionals, options };
}

/**
 * @param {Record<string, string | boolean>} options
 * @returns {{ selector?: string, noConsoleErrors: boolean }}
 */
export function sharedOptions(options) {
  return {
    selector:
      options.selector && typeof options.selector === 'string'
        ? options.selector
        : undefined,
    noConsoleErrors: isTruthyFlag(options['no-console-errors']),
  };
}

/**
 * @param {Record<string, string | boolean>} options
 * @param {string | null | undefined} outputPath
 * @returns {{ useBase64: boolean, fullPage: boolean, format: 'png' | 'jpeg' }}
 */
export function screenshotOptions(options, outputPath) {
  return {
    useBase64: isTruthyFlag(options.base64) || !outputPath,
    fullPage: isTruthyFlag(options['full-page']),
    format:
      options.format === 'jpeg' || options.format === 'jpg' ? 'jpeg' : 'png',
  };
}
