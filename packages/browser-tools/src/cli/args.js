/**
 * Pure CLI argument helpers — kept separate from bin/ so they can be unit-tested
 * without Chrome/CDP (same pattern as Playwright and other CLI tools).
 */

/**
 * Treat CLI boolean flags as true when value is true, `'true'`, or `'1'`.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isTruthyFlag(value) {
  return value === true || value === 'true' || value === '1';
}

/**
 * Parse argv into positional args and `--key` / `--key=value` options.
 *
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
 * Resolve the target URL from the --url flag or APP_URL env var.
 *
 * @param {string | boolean | undefined} urlArg  value of parsed --url option
 * @returns {string}
 */
export function resolveUrl(urlArg) {
  if (urlArg && typeof urlArg === 'string') return urlArg;
  if (process.env.APP_URL) return process.env.APP_URL;
  throw new Error('No URL: pass --url <url> or set APP_URL.');
}

/**
 * Normalize shared browser CLI flags into typed session options.
 *
 * @param {Record<string, string | boolean>} options
 * @returns {{ selector?: string, noConsoleErrors: boolean, attach: boolean, timeout?: number }}
 */
export function sharedOptions(options) {
  return {
    selector:
      options.selector && typeof options.selector === 'string'
        ? options.selector
        : undefined,
    noConsoleErrors: isTruthyFlag(options['no-console-errors']),
    attach: isTruthyFlag(options.attach),
    timeout: Number.isNaN(
      typeof options.timeout === 'string' ? Number(options.timeout) : NaN,
    )
      ? undefined
      : Number(options.timeout),
  };
}

/**
 * Normalize screenshot CLI flags into capture options.
 *
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
