#!/usr/bin/env node
/**
 * Browser verification CLI — lightweight DOM assertions over CDP.
 *
 * Requires Chrome running with remote debugging (pnpm chrome:debug).
 * Does not produce artifacts — for capture/tracing use @repo/browser-capture.
 *
 * Usage (via pnpm scripts):
 *   pnpm browser:validate --url <url> --selector <css> [--contains <text>] [--no-console-errors]
 *   pnpm browser:read     --url <url> --selector <css> [--json]
 *   pnpm browser:eval     --url <url> --expr <js> [--selector <css>] [--expect] [--no-console-errors] [--json]
 *   pnpm browser:screenshot --url <url> [--selector <css>] [--output <path>] [--base64] [--full-page] [--json]
 *
 * URL resolution when --url is omitted:
 *   1. APP_URL env var
 *   2. http://localhost:<devPort> from apps/<BUNDLER>/package.json
 *   3. Error — pass --url, APP_URL, or BUNDLER
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  assertSelectorExists,
  assertTextVisible,
  assertNoConsoleErrors,
  evaluateScript,
  readSelector,
  takeScreenshot,
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

function isTruthyFlag(value) {
  return value === true || value === 'true' || value === '1';
}

function printDiagnostics(diagnostics) {
  if (!diagnostics) return;
  console.error('--- page diagnostics ---');
  if (diagnostics.title) console.error(`title: ${diagnostics.title}`);
  if (diagnostics.url) console.error(`page url: ${diagnostics.url}`);
  if (diagnostics.hasRoot !== null && diagnostics.hasRoot !== undefined) {
    console.error(`#root present: ${diagnostics.hasRoot}`);
  }
  if (diagnostics.hasViteError) {
    console.error('vite error overlay detected');
  }
  if (diagnostics.rootHtml) {
    console.error(`#root html (truncated): ${diagnostics.rootHtml}`);
  }
  if (diagnostics.bodyText) {
    console.error(`body text (truncated): ${diagnostics.bodyText}`);
  }
  if (diagnostics.pageErrors?.length) {
    console.error('browser console:');
    for (const line of diagnostics.pageErrors) {
      console.error(`  ${line}`);
    }
  }
}

function usage() {
  console.error(`Browser verification CLI

Commands:
  validate     Assert a selector exists (and optionally contains text)
  read         Read selector content from the page
  eval         Evaluate a JavaScript expression in the page context
  screenshot   Capture viewport or element screenshot (stdout/file — not capture-tier artifacts)

Options (shared):
  --url                 Target URL (optional; falls back to APP_URL or BUNDLER port)
  --selector            CSS selector to query
  --no-console-errors   Fail on console.error or uncaught page exceptions (not warnings)

Options (validate):
  --contains            Text the selector's content must include

Options (read / eval):
  --json                Output result as JSON

Options (eval):
  --expr                JS expression or arrow function (required)
  --expect              Fail when the expression result is falsy

Options (screenshot):
  --output              Write PNG/JPEG to this file path
  --base64              Write base64-encoded image to stdout (default when --output omitted)
  --full-page           Capture full scrollable page (viewport only when omitted)
  --format              png (default) or jpeg

Examples:
  pnpm browser:validate --url http://localhost:5173 --selector "[data-testid=app-header]"
  pnpm browser:validate --url http://localhost:5173 --no-console-errors
  pnpm browser:eval --url http://localhost:5173 --expr "() => document.title" --json
  pnpm browser:eval --url http://localhost:5173 --selector "[data-testid=app-header]" \\
    --expr "() => { const s = getComputedStyle(document.querySelector('[data-testid=app-header]')); return s.display !== 'none'; }" --expect
  pnpm browser:screenshot --url http://localhost:5173 --selector "[data-testid=app-header]" --output /tmp/header.png
  pnpm browser:screenshot --url http://localhost:5173 --base64 > /tmp/page.b64

Exit codes: 0 = pass, 1 = assertion failed or error`);
}

function sharedOptions(options) {
  return {
    selector:
      options.selector && typeof options.selector === 'string'
        ? options.selector
        : undefined,
    noConsoleErrors: isTruthyFlag(options['no-console-errors']),
  };
}

async function runValidate(options) {
  const url = resolveUrl(options.url);
  const { selector, noConsoleErrors } = sharedOptions(options);
  const containsText =
    options.contains && typeof options.contains === 'string'
      ? options.contains
      : null;

  if (!selector && !noConsoleErrors) {
    console.error(
      'Error: provide --selector and/or --no-console-errors for validate',
    );
    usage();
    process.exit(1);
  }

  if (noConsoleErrors && !selector && !containsText) {
    const result = await assertNoConsoleErrors(url);
    if (!result.consoleOk) {
      console.error(`FAIL: console errors detected`);
      console.error(`      url: ${url}`);
      printDiagnostics(result.diagnostics);
      process.exit(1);
    }
    console.log(`PASS: no console errors (${url})`);
    return;
  }

  if (!selector || typeof selector !== 'string') {
    console.error('Error: --selector is required when using --contains');
    usage();
    process.exit(1);
  }

  if (containsText) {
    const result = await assertTextVisible(url, selector, containsText, {
      noConsoleErrors,
    });
    if (!result.selectorFound) {
      console.error(`FAIL: selector not found: ${selector}`);
      console.error(`      url: ${url}`);
      printDiagnostics(result.diagnostics);
      process.exit(1);
    }
    if (!result.textFound) {
      console.error(`FAIL: selector found but text not visible`);
      console.error(`      selector: ${selector}`);
      console.error(`      expected: ${containsText}`);
      console.error(`      url: ${url}`);
      process.exit(1);
    }
    if (noConsoleErrors && result.consoleOk === false) {
      console.error(`FAIL: console errors detected`);
      console.error(`      selector: ${selector}`);
      console.error(`      url: ${url}`);
      printDiagnostics(result.diagnostics);
      process.exit(1);
    }
    console.log(`PASS: "${containsText}" found in ${selector} (${url})`);
  } else {
    const result = await assertSelectorExists(url, selector, {
      noConsoleErrors,
    });
    if (!result.found) {
      console.error(`FAIL: selector not found: ${selector}`);
      console.error(`      url: ${url}`);
      printDiagnostics(result.diagnostics);
      process.exit(1);
    }
    if (noConsoleErrors && result.consoleOk === false) {
      console.error(`FAIL: console errors detected`);
      console.error(`      selector: ${selector}`);
      console.error(`      url: ${url}`);
      printDiagnostics(result.diagnostics);
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

async function runEval(options) {
  const url = resolveUrl(options.url);
  const { selector, noConsoleErrors } = sharedOptions(options);
  const expression = options.expr;
  const asJson = options.json === true;
  const expectTruthy = isTruthyFlag(options.expect);

  if (!expression || typeof expression !== 'string') {
    console.error('Error: --expr is required for eval');
    usage();
    process.exit(1);
  }

  const result = await evaluateScript(url, expression, { selector });

  if (noConsoleErrors && result.pageErrors.length > 0) {
    console.error(`FAIL: console errors detected`);
    console.error(`      url: ${url}`);
    console.error('browser console:');
    for (const line of result.pageErrors) {
      console.error(`  ${line}`);
    }
    process.exit(1);
  }

  if (expectTruthy && !result.value) {
    console.error(`FAIL: expression returned falsy value`);
    console.error(`      url: ${url}`);
    console.error(`      result: ${JSON.stringify(result.value)}`);
    process.exit(1);
  }

  if (asJson) {
    const payload = {
      url,
      selector: selector ?? null,
      value: result.value,
    };
    if (expectTruthy) payload.pass = true;
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  } else if (expectTruthy) {
    console.log(`PASS: expression truthy (${url})`);
  } else {
    const out =
      typeof result.value === 'string'
        ? result.value
        : JSON.stringify(result.value);
    process.stdout.write(out + '\n');
  }
}

async function runScreenshot(options) {
  const url = resolveUrl(options.url);
  const { selector } = sharedOptions(options);
  const outputPath =
    options.output && typeof options.output === 'string'
      ? options.output
      : null;
  const asJson = options.json === true;
  const useBase64 = isTruthyFlag(options.base64) || !outputPath;
  const fullPage = isTruthyFlag(options['full-page']);
  const format =
    options.format === 'jpeg' || options.format === 'jpg' ? 'jpeg' : 'png';

  const result = await takeScreenshot(url, {
    selector,
    fullPage,
    type: format,
  });

  if (outputPath) {
    writeFileSync(outputPath, result.buffer);
  }

  if (asJson) {
    const payload = {
      url,
      selector: selector ?? null,
      format: result.format,
      bytes: result.buffer.length,
      path: outputPath,
      base64: useBase64 ? result.buffer.toString('base64') : undefined,
    };
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    return;
  }

  if (useBase64) {
    process.stdout.write(result.buffer.toString('base64') + '\n');
    return;
  }

  console.log(
    `Screenshot saved: ${outputPath} (${result.buffer.length} bytes, ${result.format})`,
  );
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
    } else if (cmd === 'eval') {
      await runEval(options);
    } else if (cmd === 'screenshot') {
      await runScreenshot(options);
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
