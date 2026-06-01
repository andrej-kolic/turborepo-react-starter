#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';

// Detect MCP server mode early so env validation and logging behave correctly.
const _isMcpServer = process.argv[2] === 'mcp-server';

const PORT = Number(process.env.CHROME_DEBUG_PORT || 9222);
const HOST = process.env.CHROME_DEBUG_HOST || 'localhost';
const _rawCaptureDurationMs = Number(process.env.CAPTURE_DURATION_MS || 10_000);
const _captureDurationValid =
  Number.isFinite(_rawCaptureDurationMs) && _rawCaptureDurationMs > 0;

// In CLI mode, an invalid CAPTURE_DURATION_MS is a fatal startup error.
// In MCP mode, we fall back to 10 s so each tool call can still succeed.
if (!_captureDurationValid && !_isMcpServer) {
  process.stderr.write(
    `Error: CAPTURE_DURATION_MS must be a positive number, got: ${process.env.CAPTURE_DURATION_MS}\n`,
  );
  process.exit(1);
}
const DEFAULT_DURATION_MS = _captureDurationValid
  ? _rawCaptureDurationMs
  : 10_000;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(SCRIPT_DIR, '..');
const ARTIFACTS_ROOT = path.join(PACKAGE_ROOT, 'artifacts');

// In MCP mode stdout is reserved for JSON-RPC; all logging goes to stderr.
const log = (...args) => {
  if (_isMcpServer) process.stderr.write(args.join(' ') + '\n');
  else console.log(...args);
};

// Injected into each new page before navigation to collect Web Vitals.
const PERFORMANCE_OBSERVER_SOURCE = `(() => {
  const state = {
    navigationStart: performance.timeOrigin,
    lcpEntries: [],
    clsEntries: [],
    clsValue: 0,
    inpEntries: [],
    observerErrors: [],
  };

  const safeObserve = (type, callback, options) => {
    try {
      const observer = new PerformanceObserver((list) => {
        try {
          callback(list.getEntries());
        } catch (error) {
          state.observerErrors.push({
            type,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
      observer.observe(options);
    } catch (error) {
      state.observerErrors.push({
        type,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  safeObserve(
    'largest-contentful-paint',
    (entries) => {
      state.lcpEntries.push(
        ...entries.map((entry) => ({
          entryType: entry.entryType,
          startTime: entry.startTime,
          duration: entry.duration,
          size: entry.size || null,
          url: entry.url || null,
          id: entry.id || null,
          renderTime: entry.renderTime || null,
          loadTime: entry.loadTime || null,
        })),
      );
    },
    { type: 'largest-contentful-paint', buffered: true },
  );

  safeObserve(
    'layout-shift',
    (entries) => {
      for (const entry of entries) {
        if (!entry.hadRecentInput) {
          state.clsValue += entry.value;
        }
        state.clsEntries.push({
          entryType: entry.entryType,
          startTime: entry.startTime,
          value: entry.value,
          hadRecentInput: entry.hadRecentInput,
        });
      }
    },
    { type: 'layout-shift', buffered: true },
  );

  safeObserve(
    'event',
    (entries) => {
      state.inpEntries.push(
        ...entries.map((entry) => ({
          entryType: entry.entryType,
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          interactionId: entry.interactionId || 0,
        })),
      );
    },
    { type: 'event', buffered: true, durationThreshold: 0 },
  );

  window.__COPILOT_DEVTOOLS_PERF__ = state;
})();`;

// Injected into each new page before navigation to capture user interactions.
// Calls window.__recordInteraction(event) for each recorded user action.
// React component info (componentName, source location) is extracted from React
// fiber internals — only available in development builds.
const INTERACTION_RECORDER_SOURCE = `(() => {
  'use strict';

  function getElementInfo(el) {
    if (!el || !el.tagName) return null;
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      testId: el.getAttribute('data-testid') || el.getAttribute('data-test-id') || null,
      ariaLabel: el.getAttribute('aria-label') || null,
      role: el.getAttribute('role') || null,
      text: (el.textContent || '').trim().slice(0, 120) || null,
      inputType: el.type || null,
      name: el.getAttribute('name') || null,
    };
  }

  function getReactInfo(el) {
    try {
      if (!el || typeof el !== 'object') return null;
      const fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
      if (!fiberKey) return null;
      let fiber = el[fiberKey];
      // Walk up to nearest component fiber: 0=FunctionComponent, 1=ClassComponent
      while (fiber && fiber.tag !== 0 && fiber.tag !== 1) fiber = fiber.return;
      if (!fiber) return null;
      const result = {
        componentName: (fiber.type && (fiber.type.name || fiber.type.displayName)) || null,
      };
      if (fiber._debugSource) {
        // React <17: directly provides original source location
        result.fileName = fiber._debugSource.fileName;
        result.lineNumber = fiber._debugSource.lineNumber;
        result.columnNumber = fiber._debugSource.columnNumber;
      } else if (fiber._debugStack) {
        // React 17+: parse Error stack to get compiled bundle location
        const stack =
          typeof fiber._debugStack === 'string'
            ? fiber._debugStack
            : fiber._debugStack && fiber._debugStack.stack;
        const match = stack && stack.match(/\\(([^)]+):(\\d+):(\\d+)\\)/);
        if (match) {
          result.scriptUrl = match[1];
          result.lineNumber = parseInt(match[2], 10);
          result.columnNumber = parseInt(match[3], 10);
        }
      }
      return result;
    } catch (_e) {
      return null;
    }
  }

  let lastClickTime = 0;

  function send(event) {
    try {
      if (typeof window.__recordInteraction === 'function') {
        window.__recordInteraction(event);
      }
    } catch (_e) {}
  }

  // Clicks on non-text-input elements (buttons, links, checkboxes, radios, etc.)
  document.addEventListener(
    'click',
    (e) => {
      const el = e.target;
      if (!el || !el.tagName) return;
      const tag = el.tagName.toLowerCase();
      const t = el.type;
      const isTextLike =
        tag === 'input' &&
        t !== 'checkbox' &&
        t !== 'radio' &&
        t !== 'submit' &&
        t !== 'button' &&
        t !== 'reset';
      if (isTextLike || tag === 'textarea') return; // handled by 'change'
      lastClickTime = Date.now();
      send({ type: 'click', element: getElementInfo(el), react: getReactInfo(el) });
    },
    true,
  );

  // Fill / check / selectOption (fires after focus leaves the field — captures final value)
  document.addEventListener(
    'change',
    (e) => {
      const el = e.target;
      if (!el || !el.tagName) return;
      const tag = el.tagName.toLowerCase();
      const elInfo = getElementInfo(el);
      const react = getReactInfo(el);
      if (tag === 'select') {
        send({ type: 'selectOption', element: elInfo, value: el.value, react });
      } else if (tag === 'input' && (el.type === 'checkbox' || el.type === 'radio')) {
        send({ type: el.checked ? 'check' : 'uncheck', element: elInfo, react });
      } else if ((tag === 'input' && el.type !== 'file') || tag === 'textarea') {
        send({ type: 'fill', element: elInfo, value: el.value, react });
      }
    },
    true,
  );

  // SPA navigation via pushState (suppress if triggered within 1 s of a click)
  function onNavigation(url) {
    if (Date.now() - lastClickTime < 1000) return;
    send({ type: 'navigate', url: url || location.href });
  }

  const origPushState = history.pushState;
  history.pushState = function (state, title, url) {
    const result = origPushState.call(history, state, title, url);
    onNavigation(typeof url === 'string' ? url : location.href);
    return result;
  };

  window.addEventListener('popstate', () => {
    onNavigation(location.href);
  });
})();`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toArtifactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function ensureArtifactsDirectory(mode) {
  const dir = path.join(ARTIFACTS_ROOT, `${mode}-${toArtifactTimestamp()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeJson(dir, filename, value) {
  fs.writeFileSync(
    path.join(dir, filename),
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

function parseArgs(argv) {
  const positionals = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

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

    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }

  return { positionals, options };
}

function requireUrl(command, url) {
  if (!url) {
    throw new Error(`${command} requires a URL.`);
  }

  return url;
}

function resolveDurationMs(options) {
  if (options['duration-ms']) {
    const durationMs = Number(options['duration-ms']);
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new Error('duration-ms must be a positive number.');
    }

    return durationMs;
  }

  if (options.duration) {
    const durationSeconds = Number(options.duration);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error('duration must be a positive number of seconds.');
    }

    return Math.round(durationSeconds * 1000);
  }

  return DEFAULT_DURATION_MS;
}

function httpGet(pathname) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: HOST, port: PORT, path: pathname, method: 'GET' };
    const req = http.request(opts, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function httpGetJson(pathname) {
  const response = await httpGet(pathname);
  if ((response.statusCode || 500) >= 400) {
    throw new Error(
      `GET ${pathname} failed with status ${response.statusCode}`,
    );
  }

  return JSON.parse(response.data);
}

function safeExec(command) {
  try {
    return execSync(command, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
}

function getGitBranch() {
  return (
    process.env.CAPTURE_BRANCH ||
    safeExec('git branch --show-current') ||
    safeExec('git rev-parse --abbrev-ref HEAD') ||
    null
  );
}

function getGitCommit() {
  return safeExec('git rev-parse HEAD');
}

function buildMetadata(mode, artifactsDir, browserInfo, extra = {}) {
  return {
    mode,
    capturedAt: new Date().toISOString(),
    artifactDirectory: path.relative(process.cwd(), artifactsDir),
    branch: getGitBranch(),
    commit: getGitCommit(),
    chrome: {
      browser: browserInfo.Browser || browserInfo.browser || null,
      protocolVersion:
        browserInfo['Protocol-Version'] || browserInfo.protocolVersion || null,
      userAgent: browserInfo['User-Agent'] || browserInfo.userAgent || null,
      webSocketDebuggerUrl: browserInfo.webSocketDebuggerUrl || null,
    },
    devtoolsEndpoint: `http://${HOST}:${PORT}`,
    ...extra,
  };
}

function connectCDP() {
  return chromium.connectOverCDP(`http://${HOST}:${PORT}`);
}

/** Returns the most recent non-blank, non-devtools page across all existing contexts. */
function getExistingPage(browser) {
  for (const context of browser.contexts()) {
    const pages = [...context.pages()].reverse();
    if (pages.length === 0) {
      continue;
    }

    const page =
      pages.find((p) => {
        const url = p.url();
        return url !== 'about:blank' && !url.startsWith('devtools://');
      }) ?? pages[0];

    return { context, page };
  }

  throw new Error('No existing Chrome page target found.');
}

/** Attaches console and pageerror listeners; returns entry accessor. */
function createConsoleListener(page) {
  const entries = [];

  page.on('console', (msg) => {
    entries.push({
      channel: 'runtime',
      type: msg.type(),
      timestamp: Date.now(),
      text: msg.text(),
      location: msg.location(),
    });
  });

  page.on('pageerror', (error) => {
    entries.push({
      channel: 'exception',
      timestamp: Date.now(),
      text: error.message,
      stack: error.stack ?? null,
    });
  });

  return { getEntries: () => entries };
}

/**
 * Collects Web Vitals via the injected PerformanceObserver and CDP
 * Performance.getMetrics() via a CDP session for exact browser metrics.
 */
async function getPerformanceMetrics(page, cdpSession) {
  let browserMetrics = [];

  try {
    await cdpSession.send('Performance.enable', {});
    const result = await cdpSession.send('Performance.getMetrics', {});
    browserMetrics = result.metrics ?? [];
  } catch {
    // Performance domain unavailable; continue without browser metrics.
  }

  let runtimeMetrics = {
    navigationStart: null,
    lcpEntries: [],
    clsEntries: [],
    clsValue: 0,
    inpEntries: [],
    observerErrors: [],
    navigation: [],
    paints: [],
  };

  try {
    runtimeMetrics = await page.evaluate(() => {
      const state = window.__COPILOT_DEVTOOLS_PERF__ || {
        navigationStart: performance.timeOrigin,
        lcpEntries: [],
        clsEntries: [],
        clsValue: 0,
        inpEntries: [],
        observerErrors: [],
      };

      return {
        ...state,
        navigation: performance.getEntriesByType('navigation').map((entry) => ({
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          domContentLoadedEventEnd: entry.domContentLoadedEventEnd,
          loadEventEnd: entry.loadEventEnd,
          responseEnd: entry.responseEnd,
        })),
        paints: performance.getEntriesByType('paint').map((entry) => ({
          name: entry.name,
          startTime: entry.startTime,
        })),
      };
    });
  } catch {
    // Page may have navigated away; use empty defaults.
  }

  const metricMap = Object.fromEntries(
    browserMetrics.map((metric) => [metric.name, metric.value]),
  );
  const inpCandidates = (runtimeMetrics.inpEntries || []).filter(
    (entry) => Number(entry.interactionId) > 0,
  );
  const lcpEntry = (runtimeMetrics.lcpEntries || []).at(-1) ?? null;

  return {
    browserMetrics,
    metricMap,
    webVitals: {
      lcp: lcpEntry ? lcpEntry.startTime : null,
      cls: Number((runtimeMetrics.clsValue || 0).toFixed(4)),
      inp: inpCandidates.length
        ? Math.max(...inpCandidates.map((entry) => entry.duration || 0))
        : null,
    },
    runtimeMetrics,
  };
}

/**
 * Resolves a compiled bundle position (scriptUrl:line:col) to the original
 * TypeScript/JSX source file via source maps. Best-effort — returns null on
 * any failure (network error, missing source map, parse error, etc.).
 *
 * @param {string} scriptUrl - URL of the compiled JS bundle (must be http/https)
 * @param {number} line - 1-based line number in the compiled bundle
 * @param {number} col - 0-based column number in the compiled bundle
 */
async function resolveSourceLocation(scriptUrl, line, col) {
  try {
    if (!scriptUrl.startsWith('http://') && !scriptUrl.startsWith('https://')) {
      return null; // webpack:// or other non-HTTP source URLs — not fetchable
    }

    // Fetch the compiled script and find its sourceMappingURL annotation
    const scriptRes = await fetch(scriptUrl);
    if (!scriptRes.ok) return null;
    const scriptText = await scriptRes.text();

    const scriptLines = scriptText.split('\n');
    let sourceMapRef = null;
    // Scan from the end (annotations are always in the last few lines)
    for (
      let i = scriptLines.length - 1;
      i >= Math.max(0, scriptLines.length - 10);
      i--
    ) {
      const t = scriptLines[i].trim();
      // Handles both //# and /*# sourceMappingURL styles
      const m =
        t.match(/\/\/[#@]\s*sourceMappingURL=(.+)/) ||
        t.match(/\/\*[#@]\s*sourceMappingURL=(.+?)\s*\*\//);
      if (m) {
        sourceMapRef = m[1].trim();
        break;
      }
    }
    if (!sourceMapRef) return null;

    // Fetch or decode the source map
    let rawMap;
    if (sourceMapRef.startsWith('data:')) {
      // Inline base64-encoded source map
      const comma = sourceMapRef.indexOf(',');
      if (comma === -1) return null;
      const payload = sourceMapRef.slice(comma + 1);
      const header = sourceMapRef.slice(5, comma).toLowerCase();
      rawMap = header.includes('base64')
        ? Buffer.from(payload, 'base64').toString('utf8')
        : decodeURIComponent(payload);
    } else {
      const mapUrl = new URL(sourceMapRef, scriptRes.url).href;
      const mapRes = await fetch(mapUrl);
      if (!mapRes.ok) return null;
      rawMap = await mapRes.text();
    }

    const tracer = new TraceMap(JSON.parse(rawMap));
    const pos = originalPositionFor(tracer, { line, column: col });
    if (!pos.source || pos.line == null) return null;

    return { source: pos.source, line: pos.line, column: pos.column ?? 0 };
  } catch {
    return null;
  }
}

/**
 * Converts a recorded interaction's element info to a Playwright locator call.
 * Priority: data-testid > aria-label > id > role+name > visible text > tag
 *
 * @param {{ element: object }} interaction
 * @returns {string|null} e.g. 'page.getByTestId("submit")'
 */
function interactionToLocator(interaction) {
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

/**
 * Generates a Playwright TypeScript test from a list of recorded interactions.
 * Uses template strings (no AST). String values are JSON-serialized to
 * prevent code injection from captured text/values.
 *
 * @param {string} url - The initial URL
 * @param {Array} interactions - Array of interaction event objects
 * @returns {string} TypeScript source of the generated test file
 */
function generatePlaywrightTest(url, interactions) {
  const actionLines = [];

  for (const interaction of interactions) {
    const locator = interactionToLocator(interaction);
    // React source comment (sanitized — remove */ to avoid breaking JS comments)
    let comment = '';
    const r = interaction.react;
    if (r) {
      const src = r.originalSource
        ? `${r.originalSource.source}:${r.originalSource.line}`
        : r.fileName
          ? `${r.fileName}:${r.lineNumber}`
          : null;
      const name = r.componentName
        ? r.componentName.replace(/\*\//g, '')
        : null;
      if (name || src) comment = ` // ${[name, src].filter(Boolean).join(' ')}`;
    }

    switch (interaction.type) {
      case 'navigate':
        actionLines.push(
          `  await page.goto(${JSON.stringify(interaction.url)});`,
        );
        break;
      case 'click':
        if (!locator) break;
        actionLines.push(`  await ${locator}.click();${comment}`);
        break;
      case 'fill':
        if (!locator) break;
        actionLines.push(
          `  await ${locator}.fill(${JSON.stringify(interaction.value ?? '')});${comment}`,
        );
        break;
      case 'check':
        if (!locator) break;
        actionLines.push(`  await ${locator}.check();${comment}`);
        break;
      case 'uncheck':
        if (!locator) break;
        actionLines.push(`  await ${locator}.uncheck();${comment}`);
        break;
      case 'selectOption':
        if (!locator) break;
        actionLines.push(
          `  await ${locator}.selectOption(${JSON.stringify(interaction.value ?? '')});${comment}`,
        );
        break;
      default:
        break;
    }
  }

  let testLabel;
  try {
    const u = new URL(url);
    testLabel = u.hostname + u.pathname;
  } catch {
    testLabel = url;
  }

  return [
    `import { test, expect } from '@playwright/test';`,
    ``,
    `// Generated by copilot-devtools record-interactions`,
    `// Source: ${url}`,
    `// Captured: ${new Date().toISOString()}`,
    ``,
    `test(${JSON.stringify('recorded: ' + testLabel)}, async ({ page }) => {`,
    `  await page.goto(${JSON.stringify(url)});`,
    ...actionLines,
    `});`,
    ``,
  ].join('\n');
}

async function captureSnapshot() {
  const artifactsDir = ensureArtifactsDirectory('snapshot');
  const browserInfo = await httpGetJson('/json/version');
  const pages = await httpGetJson('/json/list');
  const metadata = buildMetadata('snapshot', artifactsDir, browserInfo, {
    pageCount: pages.length,
    url: null,
  });

  writeJson(artifactsDir, 'metadata.json', metadata);
  writeJson(artifactsDir, 'version.json', browserInfo);
  writeJson(artifactsDir, 'pages.json', pages);

  log(`Saved snapshot artifacts to ${artifactsDir}`);
  return { artifactsDir, metadata };
}

async function recordTrace(url, options = {}) {
  const targetUrl = requireUrl('record-trace', url);
  const durationMs = resolveDurationMs(options);
  const artifactsDir = ensureArtifactsDirectory('trace');
  const browserInfo = await httpGetJson('/json/version');
  const harPath = path.join(artifactsDir, 'har.json');
  const tracePath = path.join(artifactsDir, 'trace.zip');

  const browser = await connectCDP();
  const context = await browser.newContext({
    recordHar: { path: harPath, content: 'omit' },
  });
  let tracingStarted = false;
  let requestCount = 0;
  let captureResult = null;

  try {
    await context.tracing.start({ screenshots: true, snapshots: true });
    tracingStarted = true;

    const page = await context.newPage();
    await page.addInitScript({ content: PERFORMANCE_OBSERVER_SOURCE });
    const consoleListener = createConsoleListener(page);
    page.on('request', () => {
      requestCount += 1;
    });

    await page.goto(targetUrl, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(durationMs);

    const cdpSession = await context.newCDPSession(page);
    const [pageDetails, performancePayload] = await Promise.all([
      page
        .evaluate(() => ({ url: location.href, title: document.title }))
        .catch(() => ({ url: null, title: null })),
      getPerformanceMetrics(page, cdpSession),
    ]);

    await context.tracing.stop({ path: tracePath });
    tracingStarted = false;
    await context.close(); // Finalizes HAR to disk.

    const consoleEntries = consoleListener.getEntries();
    const metadata = buildMetadata('trace', artifactsDir, browserInfo, {
      url: pageDetails.url || targetUrl,
      title: pageDetails.title || null,
      durationMs,
      requestCount,
      consoleMessageCount: consoleEntries.length,
      traceFormat: 'playwright-zip',
    });

    writeJson(artifactsDir, 'metadata.json', metadata);
    writeJson(artifactsDir, 'console.json', { entries: consoleEntries });
    writeJson(artifactsDir, 'performance.json', performancePayload);

    log(`Saved trace artifacts to ${artifactsDir}`);
    captureResult = {
      artifactsDir,
      metadata,
      webVitals: performancePayload.webVitals,
      requestCount,
      consoleMessageCount: consoleEntries.length,
    };
  } finally {
    if (tracingStarted) {
      await context.tracing.stop({ path: tracePath }).catch(() => {});
    }

    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  return captureResult;
}

async function recordPerformance(url, options = {}) {
  const targetUrl = requireUrl('record-performance', url);
  const durationMs = resolveDurationMs(options);
  const artifactsDir = ensureArtifactsDirectory('performance');
  const browserInfo = await httpGetJson('/json/version');

  const browser = await connectCDP();
  const context = await browser.newContext();
  let captureResult = null;

  try {
    const page = await context.newPage();
    await page.addInitScript({ content: PERFORMANCE_OBSERVER_SOURCE });

    await page.goto(targetUrl, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(durationMs);

    const cdpSession = await context.newCDPSession(page);
    const [pageDetails, performancePayload] = await Promise.all([
      page
        .evaluate(() => ({ url: location.href, title: document.title }))
        .catch(() => ({ url: null, title: null })),
      getPerformanceMetrics(page, cdpSession),
    ]);

    const metadata = buildMetadata('performance', artifactsDir, browserInfo, {
      url: pageDetails.url || targetUrl,
      title: pageDetails.title || null,
      durationMs,
    });

    writeJson(artifactsDir, 'metadata.json', metadata);
    writeJson(artifactsDir, 'performance.json', performancePayload);

    log(`Saved performance artifacts to ${artifactsDir}`);
    captureResult = {
      artifactsDir,
      metadata,
      webVitals: performancePayload.webVitals,
      browserMetricsCount: performancePayload.browserMetrics.length,
    };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  return captureResult;
}

async function recordConsole(options = {}) {
  const durationMs = resolveDurationMs(options);
  const artifactsDir = ensureArtifactsDirectory('console');
  const browserInfo = await httpGetJson('/json/version');

  const browser = await connectCDP();
  let captureResult = null;

  try {
    const { page } = getExistingPage(browser);
    const consoleListener = createConsoleListener(page);

    await sleep(durationMs);

    const pageDetails = await page
      .evaluate(() => ({ url: location.href, title: document.title }))
      .catch(() => ({ url: null, title: null }));
    const consoleEntries = consoleListener.getEntries();
    const metadata = buildMetadata('console', artifactsDir, browserInfo, {
      url: pageDetails.url || null,
      title: pageDetails.title || null,
      durationMs,
      consoleMessageCount: consoleEntries.length,
    });

    writeJson(artifactsDir, 'metadata.json', metadata);
    writeJson(artifactsDir, 'console.json', { entries: consoleEntries });

    log(`Saved console artifacts to ${artifactsDir}`);
    captureResult = {
      artifactsDir,
      metadata,
      consoleMessageCount: consoleEntries.length,
    };
  } finally {
    await browser.close().catch(() => {});
  }

  return captureResult;
}

async function recordInteractions(url, options = {}) {
  const targetUrl = requireUrl('record-interactions', url);
  const durationMs = resolveDurationMs(options);
  const artifactsDir = ensureArtifactsDirectory('interactions');
  const browserInfo = await httpGetJson('/json/version');

  const browser = await connectCDP();
  const context = await browser.newContext();
  const interactions = [];
  let captureResult = null;

  try {
    const page = await context.newPage();

    // exposeFunction must be called before addInitScript / goto so the
    // window binding is available when the injected script first runs.
    await page.exposeFunction('__recordInteraction', (event) => {
      interactions.push({ ...event, timestamp: Date.now() });
    });
    await page.addInitScript({ content: INTERACTION_RECORDER_SOURCE });

    await page.goto(targetUrl, { waitUntil: 'load', timeout: 30_000 });
    log(`Recording interactions on ${targetUrl} for ${durationMs / 1000}s...`);
    log('Interact with the page. Interactions are captured automatically.');

    // waitForTimeout rejects if the page closes during recording — that's fine,
    // we still save whatever was captured.
    await page.waitForTimeout(durationMs).catch(() => {});

    // Flush any focused text input whose 'change' event may not have fired yet
    const activeInput = await page
      .evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        const tag = el.tagName?.toLowerCase();
        if (
          (tag === 'input' || tag === 'textarea') &&
          el.type !== 'checkbox' &&
          el.type !== 'radio' &&
          el.type !== 'file'
        ) {
          return {
            tag,
            value: el.value,
            id: el.id || null,
            testId: el.getAttribute('data-testid') || null,
            name: el.getAttribute('name') || null,
          };
        }
        return null;
      })
      .catch(() => null);

    if (activeInput?.value) {
      const last = interactions.at(-1);
      const isDuplicate =
        last?.type === 'fill' && last?.value === activeInput.value;
      if (!isDuplicate) {
        interactions.push({
          type: 'fill',
          element: {
            tag: activeInput.tag,
            id: activeInput.id,
            testId: activeInput.testId,
            name: activeInput.name,
          },
          value: activeInput.value,
          react: null,
          timestamp: Date.now(),
        });
      }
    }

    // Enrich interactions that have a compiled bundle URL with source-mapped
    // original source file + line (best-effort; silently skipped on failure).
    for (const interaction of interactions) {
      if (interaction.react?.scriptUrl && !interaction.react?.fileName) {
        const resolved = await resolveSourceLocation(
          interaction.react.scriptUrl,
          interaction.react.lineNumber ?? 1,
          interaction.react.columnNumber ?? 0,
        );
        if (resolved) interaction.react.originalSource = resolved;
      }
    }

    const pageDetails = await page
      .evaluate(() => ({ url: location.href, title: document.title }))
      .catch(() => ({ url: null, title: null }));

    const metadata = buildMetadata('interactions', artifactsDir, browserInfo, {
      url: pageDetails.url || targetUrl,
      title: pageDetails.title || null,
      durationMs,
      interactionCount: interactions.length,
    });

    writeJson(artifactsDir, 'metadata.json', metadata);
    writeJson(artifactsDir, 'interactions.json', { interactions });

    const testCode = generatePlaywrightTest(targetUrl, interactions);
    const testFilePath = path.join(artifactsDir, 'generated.test.ts');
    fs.writeFileSync(testFilePath, testCode, 'utf8');

    log(`Captured ${interactions.length} interaction(s).`);
    log(`Generated test: ${testFilePath}`);
    log(`Saved interaction artifacts to ${artifactsDir}`);

    captureResult = {
      artifactsDir,
      metadata,
      interactionCount: interactions.length,
      testFile: testFilePath,
    };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  return captureResult;
}

function uploadArtifacts() {
  if (!fs.existsSync(ARTIFACTS_ROOT)) {
    throw new Error('No artifacts found.');
  }

  const tar = path.join(PACKAGE_ROOT, `artifacts-${Date.now()}.tar.gz`);
  execSync(`tar -czf "${tar}" -C "${ARTIFACTS_ROOT}" .`);
  log(`Packaged artifacts to ${tar}`);
}

function usage() {
  console.log('copilot-devtools CLI');
  console.log(
    'Usage: copilot-devtools <command> [url] [--duration <seconds>] [--duration-ms <ms>]',
  );
  console.log('Commands:');
  console.log(
    '  capture-snapshot                   Fetch browser metadata and page list',
  );
  console.log(
    '  record-trace <url>                 Full trace: HAR + Playwright trace + console + Web Vitals',
  );
  console.log(
    '  record-performance <url>           Web Vitals: LCP, CLS, INP and CDP browser metrics',
  );
  console.log(
    '  record-console                     Console messages from current page',
  );
  console.log(
    '  record-interactions <url>          Record user interactions and generate a Playwright test',
  );
  console.log(
    '  upload-artifacts                   Package artifacts/  as tar.gz',
  );
  console.log(
    '  mcp-server                         Start an MCP server (stdio) exposing capture tools',
  );
}

/**
 * Starts an MCP server over stdio, exposing the capture commands as tools.
 * Stdout is reserved for JSON-RPC messages; all diagnostics go to stderr.
 */
async function startMcpServer() {
  const pkg = JSON.parse(
    fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  );

  const server = new McpServer({
    name: 'copilot-devtools',
    version: pkg.version,
  });

  server.registerTool(
    'capture_snapshot',
    {
      title: 'Capture Snapshot',
      description:
        'Capture Chrome browser metadata and the list of open pages. Requires Chrome running with --remote-debugging-port=9222 (run: pnpm chrome:debug).',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        const result = await captureSnapshot();
        return {
          content: [
            {
              type: 'text',
              text: `Snapshot saved to ${result.artifactsDir}\nFiles: metadata.json, version.json, pages.json\nPages found: ${result.metadata.pageCount}`,
            },
          ],
          structuredContent: {
            artifactsDir: result.artifactsDir,
            pageCount: result.metadata.pageCount,
            chrome: result.metadata.chrome,
            capturedAt: result.metadata.capturedAt,
          },
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'record_trace',
    {
      title: 'Record Trace',
      description:
        'Navigate to a URL and record a full trace: HAR network log, Playwright trace (screenshots + DOM snapshots), console messages, and Web Vitals. Requires Chrome running with --remote-debugging-port=9222.',
      inputSchema: z.object({
        url: z.string().url().describe('URL to navigate to and record'),
        duration: z
          .number()
          .optional()
          .describe(
            'Capture duration in seconds after page load (default: 10)',
          ),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) => {
      try {
        const options =
          args.duration !== undefined
            ? { duration: String(args.duration) }
            : {};
        const result = await recordTrace(args.url, options);
        const { lcp, cls, inp } = result.webVitals;
        return {
          content: [
            {
              type: 'text',
              text: [
                `Trace saved to ${result.artifactsDir}`,
                `Files: metadata.json, har.json, trace.zip, console.json, performance.json`,
                `View trace: npx playwright show-trace ${result.artifactsDir}/trace.zip`,
                `Web Vitals: LCP=${lcp != null ? `${Math.round(lcp)}ms` : 'n/a'}, CLS=${cls}, INP=${inp != null ? `${Math.round(inp)}ms` : 'n/a'}`,
                `Requests: ${result.requestCount}, Console messages: ${result.consoleMessageCount}`,
              ].join('\n'),
            },
          ],
          structuredContent: {
            artifactsDir: result.artifactsDir,
            files: [
              'metadata.json',
              'har.json',
              'trace.zip',
              'console.json',
              'performance.json',
            ],
            url: result.metadata.url,
            webVitals: result.webVitals,
            requestCount: result.requestCount,
            consoleMessageCount: result.consoleMessageCount,
            durationMs: result.metadata.durationMs,
          },
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'record_performance',
    {
      title: 'Record Performance',
      description:
        'Navigate to a URL and collect Web Vitals (LCP, CLS, INP) plus 36 CDP browser metrics. Requires Chrome running with --remote-debugging-port=9222.',
      inputSchema: z.object({
        url: z.string().url().describe('URL to navigate to and measure'),
        duration: z
          .number()
          .optional()
          .describe(
            'Observation duration in seconds after page load (default: 10)',
          ),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) => {
      try {
        const options =
          args.duration !== undefined
            ? { duration: String(args.duration) }
            : {};
        const result = await recordPerformance(args.url, options);
        const { lcp, cls, inp } = result.webVitals;
        return {
          content: [
            {
              type: 'text',
              text: [
                `Performance saved to ${result.artifactsDir}`,
                `Files: metadata.json, performance.json`,
                `Web Vitals: LCP=${lcp != null ? `${Math.round(lcp)}ms` : 'n/a'}, CLS=${cls}, INP=${inp != null ? `${Math.round(inp)}ms` : 'n/a'}`,
                `Browser metrics: ${result.browserMetricsCount} measurements`,
              ].join('\n'),
            },
          ],
          structuredContent: {
            artifactsDir: result.artifactsDir,
            files: ['metadata.json', 'performance.json'],
            url: result.metadata.url,
            webVitals: result.webVitals,
            browserMetricsCount: result.browserMetricsCount,
            durationMs: result.metadata.durationMs,
          },
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'record_console',
    {
      title: 'Record Console',
      description:
        'Listen to console output of the currently open Chrome tab for a specified duration. Requires Chrome running with --remote-debugging-port=9222 and at least one open tab. For navigating to a URL, use record_trace instead.',
      inputSchema: z.object({
        duration: z
          .number()
          .optional()
          .describe('Duration to listen in seconds (default: 10)'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        const options =
          args.duration !== undefined
            ? { duration: String(args.duration) }
            : {};
        const result = await recordConsole(options);
        return {
          content: [
            {
              type: 'text',
              text: [
                `Console log saved to ${result.artifactsDir}`,
                `Files: metadata.json, console.json`,
                `Messages captured: ${result.consoleMessageCount}`,
                `Page: ${result.metadata.url || 'unknown'}`,
              ].join('\n'),
            },
          ],
          structuredContent: {
            artifactsDir: result.artifactsDir,
            files: ['metadata.json', 'console.json'],
            url: result.metadata.url,
            consoleMessageCount: result.consoleMessageCount,
            durationMs: result.metadata.durationMs,
          },
        };
      } catch (err) {
        const message = err.message.includes('No existing Chrome page')
          ? 'record_console requires an already-open Chrome tab. Open a page in Chrome first, then retry. For navigating to a URL, use record_trace instead.'
          : err.message;
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'record_interactions',
    {
      title: 'Record Interactions',
      description:
        'Navigate to a URL, record user interactions (clicks, form fills, navigation) for a given duration, and generate a ready-to-run Playwright test file. React component source locations are included when available (requires the app to be running in dev mode). Requires Chrome running with --remote-debugging-port=9222.',
      inputSchema: z.object({
        url: z
          .string()
          .url()
          .describe('URL to navigate to and record interactions on'),
        duration: z
          .number()
          .optional()
          .describe(
            'Recording duration in seconds — interact with the page during this window (default: 10)',
          ),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) => {
      try {
        const options =
          args.duration !== undefined
            ? { duration: String(args.duration) }
            : {};
        const result = await recordInteractions(args.url, options);
        return {
          content: [
            {
              type: 'text',
              text: [
                `Interactions saved to ${result.artifactsDir}`,
                `Files: metadata.json, interactions.json, generated.test.ts`,
                `Interactions captured: ${result.interactionCount}`,
                `Generated test: ${result.testFile}`,
              ].join('\n'),
            },
          ],
          structuredContent: {
            artifactsDir: result.artifactsDir,
            files: ['metadata.json', 'interactions.json', 'generated.test.ts'],
            url: result.metadata.url,
            interactionCount: result.interactionCount,
            testFile: result.testFile,
            durationMs: result.metadata.durationMs,
          },
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('copilot-devtools MCP server started (stdio)\n');

  process.once('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
  process.once('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}

async function main() {
  const cmd = process.argv[2];

  // MCP server: runs indefinitely; errors go to stderr only (stdout = JSON-RPC).
  if (cmd === 'mcp-server') {
    try {
      await startMcpServer();
    } catch (error) {
      process.stderr.write(
        `Failed to start MCP server: ${error instanceof Error ? error.message : error}\n`,
      );
      process.exit(1);
    }
    return;
  }

  const { positionals, options } = parseArgs(process.argv.slice(3));
  const url = positionals[0] || process.env.CAPTURE_URL;

  if (!cmd || cmd === 'help' || cmd === '--help') {
    usage();
    process.exit(0);
  }

  try {
    if (cmd === 'capture-snapshot') {
      await captureSnapshot();
      return;
    }

    if (cmd === 'record-trace') {
      await recordTrace(url, options);
      return;
    }

    if (cmd === 'record-performance') {
      await recordPerformance(url, options);
      return;
    }

    if (cmd === 'record-console') {
      await recordConsole(options);
      return;
    }

    if (cmd === 'record-interactions') {
      await recordInteractions(url, options);
      return;
    }

    if (cmd === 'upload-artifacts') {
      uploadArtifacts();
      return;
    }

    throw new Error(`Unknown command: ${cmd}`);
  } catch (error) {
    console.error(
      'Failed to execute command:',
      error instanceof Error ? error.message : error,
    );
    usage();
    process.exit(1);
  }
}

await main();
