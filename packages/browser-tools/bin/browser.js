#!/usr/bin/env node
/**
 * Browser operations CLI — assert, read, and snapshot the live app via CDP.
 *
 * Requires Chrome running with remote debugging (pnpm chrome:debug).
 * Does not produce artifacts — for capture/tracing use @repo/browser-capture.
 *
 * Usage (via pnpm scripts):
 *   pnpm browser:open       --url <url>
 *   pnpm browser:validate  --url <url> --selector <css> [--contains <text>] [--no-console-errors] [--attach]
 *   pnpm browser:read      --url <url> --selector <css> [--json] [--attach]
 *   pnpm browser:eval      --url <url> --expr <js> [--selector <css>] [--expect] [--no-console-errors] [--json] [--attach]
 *   pnpm browser:screenshot --url <url> [--selector <css>] [--output <path>] [--base64] [--full-page] [--json] [--attach]
 *   pnpm browser:snapshot  --url <url> [--selector <css>] [--json] [--attach]
 *
 * URL resolution when --url is omitted:
 *   1. APP_URL env var (injected by pnpm scripts via with-app-url.js)
 *   2. Error — pass --url or run via pnpm browser
 */

import { writeFileSync } from 'fs';
import {
  assertSelectorExists,
  assertTextVisible,
  assertNoConsoleErrors,
  evaluateScript,
  formatPageSnapshot,
  openUrl,
  readSelector,
  takePageSnapshot,
  takeScreenshot,
} from '../src/cdp/index.js';
import {
  isTruthyFlag,
  parseArgs,
  screenshotOptions,
  sharedOptions,
} from '../src/cli/args.js';

function resolveUrl(urlArg) {
  if (urlArg && typeof urlArg === 'string') return urlArg;
  if (process.env.APP_URL) return process.env.APP_URL;
  throw new Error(
    'No URL. Provide --url or set APP_URL.\n' +
      '  Run via: pnpm browser (resolves URL automatically from BUNDLER)\n' +
      '  Or pass: pnpm browser <subcommand> --url http://localhost:<port>',
  );
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
  console.error(`Browser operations CLI

Commands:
  open         Navigate the visible Chrome window to a URL (preserves session/auth)
  validate     Assert a selector exists (and optionally contains text)
  read         Read selector content from the page
  eval         Evaluate a JavaScript expression in the page context
  screenshot   Capture viewport or element screenshot (stdout/file — not capture-tier artifacts)
  snapshot     Structured page snapshot (ARIA tree + data-testid regions)

Options (shared):
  --url                 Target URL (optional; falls back to APP_URL or BUNDLER port)
  --selector            CSS selector to query
  --no-console-errors   Fail on console.error or uncaught page exceptions (not warnings)
  --attach              Run on the existing visible tab instead of a new isolated session.
                        Preserves authentication and current page state. Requires a tab
                        already open at that origin (use browser-tools open first if needed).

Options (open):
  --url                 URL to navigate to (required)

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

Options (snapshot):
  --json                Output snapshot as JSON (default: human-readable text)

Examples:
  browser-tools open --url http://localhost:5173
  browser-tools validate --url http://localhost:5173 --selector "[data-testid=app-header]"
  browser-tools validate --url http://localhost:5173 --no-console-errors
  browser-tools snapshot --url http://localhost:5173 --attach
  browser-tools eval --url http://localhost:5173 --expr "() => document.title" --json
  browser-tools eval --url http://localhost:5173 --selector "[data-testid=app-header]" \\
    --expr "() => { const s = getComputedStyle(document.querySelector('[data-testid=app-header]')); return s.display !== 'none'; }" --expect
  browser-tools screenshot --url http://localhost:5173 --selector "[data-testid=app-header]" --output /tmp/header.png
  browser-tools screenshot --url http://localhost:5173 --base64 > /tmp/page.b64
  browser-tools snapshot --url http://localhost:5173
  browser-tools snapshot --url http://localhost:5173 --selector "[data-testid=app-header]" --json

Exit codes: 0 = pass, 1 = assertion failed or error`);
}

async function runOpen(options) {
  const url = resolveUrl(options.url);
  const result = await openUrl(url);
  console.log(
    `Opened: ${result.url}${result.navigated ? '' : ' (already loaded)'}`,
  );
}

async function runValidate(options) {
  const url = resolveUrl(options.url);
  const { selector, noConsoleErrors, attach } = sharedOptions(options);
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
    const result = await assertNoConsoleErrors(url, { attach });
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
      attach,
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
      attach,
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
  const { selector, attach } = sharedOptions(options);
  const asJson = options.json === true;

  if (!selector || typeof selector !== 'string') {
    console.error('Error: --selector is required for read');
    usage();
    process.exit(1);
  }

  const result = await readSelector(url, selector, { attach });

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
  const { selector, noConsoleErrors, attach } = sharedOptions(options);
  const expression = options.expr;
  const asJson = options.json === true;
  const expectTruthy = isTruthyFlag(options.expect);

  if (!expression || typeof expression !== 'string') {
    console.error('Error: --expr is required for eval');
    usage();
    process.exit(1);
  }

  const result = await evaluateScript(url, expression, { selector, attach });

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
  const { selector, attach } = sharedOptions(options);
  const outputPath =
    options.output && typeof options.output === 'string'
      ? options.output
      : null;
  const asJson = options.json === true;
  const { useBase64, fullPage, format } = screenshotOptions(
    options,
    outputPath,
  );

  const result = await takeScreenshot(url, {
    selector,
    fullPage,
    type: format,
    attach,
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

async function runSnapshot(options) {
  const url = resolveUrl(options.url);
  const { selector, attach } = sharedOptions(options);
  const asJson = options.json === true;

  const result = await takePageSnapshot(url, { selector, attach });

  if (!result.found || !result.snapshot) {
    console.error(`Error: could not capture snapshot`);
    console.error(`       url: ${url}`);
    if (selector) {
      console.error(`       selector: ${selector}`);
    }
    printDiagnostics(result.diagnostics);
    process.exit(1);
  }

  if (asJson) {
    process.stdout.write(
      JSON.stringify(
        {
          url: result.snapshot.url,
          title: result.snapshot.title,
          selector: selector ?? null,
          testIds: result.snapshot.testIds,
          ariaYaml: result.snapshot.ariaYaml,
        },
        null,
        2,
      ) + '\n',
    );
    return;
  }

  process.stdout.write(formatPageSnapshot(result.snapshot) + '\n');
}

async function main() {
  const cmd = process.argv[2];
  const { options } = parseArgs(process.argv.slice(3));

  if (!cmd || cmd === 'help' || cmd === '--help') {
    usage();
    process.exit(0);
  }

  try {
    if (cmd === 'open') {
      await runOpen(options);
    } else if (cmd === 'validate') {
      await runValidate(options);
    } else if (cmd === 'read') {
      await runRead(options);
    } else if (cmd === 'eval') {
      await runEval(options);
    } else if (cmd === 'screenshot') {
      await runScreenshot(options);
    } else if (cmd === 'snapshot') {
      await runSnapshot(options);
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
        `       Run: pnpm browser:setup --url <url>  — starts Chrome and opens a tab`,
      );
    } else {
      console.error(`Error: ${msg}`);
    }
    process.exit(1);
  }
}

await main();
