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
