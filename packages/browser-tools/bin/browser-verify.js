#!/usr/bin/env node
/**
 * Browser verification CLI — lightweight DOM assertions over CDP.
 *
 * Requires Chrome running with remote debugging (pnpm chrome:debug).
 * Does not produce artifacts — for capture/tracing use @repo/browser-capture.
 *
 * Usage (via pnpm scripts):
 *   pnpm browser:validate --url <url> --selector <css> [--contains <text>]
 *   pnpm browser:read     --url <url> --selector <css> [--json]
 *
 * URL resolution when --url is omitted:
 *   1. APP_URL env var
 *   2. http://localhost:<devPort> from apps/<BUNDLER>/package.json
 *   3. Error — pass --url, APP_URL, or BUNDLER
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  assertSelectorExists,
  assertTextVisible,
  readSelector,
} from '../src/cdp/verify.js';

const WORKSPACE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

/** `devPort` in apps/<BUNDLER>/package.json is the single source of truth. */
function resolveBundlerDevPort(bundler) {
  const pkgPath = resolve(WORKSPACE_ROOT, 'apps', bundler, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    throw new Error(
      `Could not read apps/${bundler}/package.json. Check BUNDLER or pass --url.`,
    );
  }
  const port = pkg.devPort;
  if (typeof port !== 'number') {
    throw new Error(
      `apps/${bundler}/package.json has no devPort. Pass --url instead.`,
    );
  }
  return port;
}

function parseArgs(argv) {
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

function resolveUrl(urlArg) {
  if (urlArg && typeof urlArg === 'string') return urlArg;
  if (process.env.APP_URL) return process.env.APP_URL;
  const bundler = process.env.BUNDLER;
  if (bundler) {
    return `http://localhost:${resolveBundlerDevPort(bundler)}`;
  }
  throw new Error(
    'Could not resolve app URL. Provide --url, set APP_URL, or set BUNDLER (devPort from apps/<BUNDLER>/package.json).',
  );
}

function usage() {
  console.error(`Browser verification CLI

Commands:
  validate    Assert a selector exists (and optionally contains text)
  read        Read selector content from the page

Options:
  --url       Target URL (optional; falls back to APP_URL or BUNDLER port)
  --selector  CSS selector to query (required)
  --contains  Text the selector's content must include (validate only)
  --json      Output result as JSON (read only)

Examples:
  pnpm browser:validate --url http://localhost:5173 --selector "[data-testid=app-header]"
  pnpm browser:validate --url http://localhost:5173 --selector "h1" --contains "Welcome"
  pnpm browser:read     --url http://localhost:5173 --selector "body" --json

Exit codes: 0 = pass, 1 = assertion failed or error`);
}

async function runValidate(options) {
  const url = resolveUrl(options.url);
  const selector = options.selector;

  if (!selector || typeof selector !== 'string') {
    console.error('Error: --selector is required for validate');
    usage();
    process.exit(1);
  }

  const containsText =
    options.contains && typeof options.contains === 'string'
      ? options.contains
      : null;

  if (containsText) {
    const result = await assertTextVisible(url, selector, containsText);
    if (!result.selectorFound) {
      console.error(`FAIL: selector not found: ${selector}`);
      console.error(`      url: ${url}`);
      process.exit(1);
    }
    if (!result.textFound) {
      console.error(`FAIL: selector found but text not visible`);
      console.error(`      selector: ${selector}`);
      console.error(`      expected: ${containsText}`);
      console.error(`      url: ${url}`);
      process.exit(1);
    }
    console.log(`PASS: "${containsText}" found in ${selector} (${url})`);
  } else {
    const found = await assertSelectorExists(url, selector);
    if (!found) {
      console.error(`FAIL: selector not found: ${selector}`);
      console.error(`      url: ${url}`);
      process.exit(1);
    }
    console.log(`PASS: ${selector} exists (${url})`);
  }
}

async function runRead(options) {
  const url = resolveUrl(options.url);
  const selector = options.selector;
  const asJson = options.json === true;

  if (!selector || typeof selector !== 'string') {
    console.error('Error: --selector is required for read');
    usage();
    process.exit(1);
  }

  const result = await readSelector(url, selector);

  if (!result.found) {
    console.error(`Error: selector not found: ${selector}`);
    console.error(`       url: ${url}`);
    process.exit(1);
  }

  if (asJson) {
    process.stdout.write(
      JSON.stringify({ url, selector, ...result }, null, 2) + '\n',
    );
  } else {
    process.stdout.write((result.text ?? '') + '\n');
  }
}

async function main() {
  const cmd = process.argv[2];
  const { options } = parseArgs(process.argv.slice(3));

  if (!cmd || cmd === 'help' || cmd === '--help') {
    usage();
    process.exit(0);
  }

  try {
    if (cmd === 'validate') {
      await runValidate(options);
    } else if (cmd === 'read') {
      await runRead(options);
    } else {
      console.error(`Unknown command: ${cmd}`);
      usage();
      process.exit(1);
    }
  } catch (err) {
    const msg = err.message ?? String(err);
    if (
      msg.includes('ECONNREFUSED') ||
      msg.includes('connect') ||
      msg.includes('CDP')
    ) {
      console.error(
        `Error: Could not connect to Chrome on port ${process.env.CHROME_DEBUG_PORT || 9222}.`,
      );
      console.error(
        `       Start Chrome first: pnpm chrome:debug  (or: CHROME_HEADLESS=true pnpm chrome:debug)`,
      );
    } else {
      console.error(`Error: ${msg}`);
    }
    process.exit(1);
  }
}

await main();
