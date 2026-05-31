#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import CDP from 'chrome-remote-interface';

const PORT = Number(process.env.CHROME_DEBUG_PORT || 9222);
const HOST = process.env.CHROME_DEBUG_HOST || 'localhost';
const _rawCaptureDurationMs = Number(process.env.CAPTURE_DURATION_MS || 10_000);
if (!Number.isFinite(_rawCaptureDurationMs) || _rawCaptureDurationMs <= 0) {
  process.stderr.write(
    `Error: CAPTURE_DURATION_MS must be a positive number, got: ${process.env.CAPTURE_DURATION_MS}\n`,
  );
  process.exit(1);
}
const DEFAULT_DURATION_MS = _rawCaptureDurationMs;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(SCRIPT_DIR, '..');
const ARTIFACTS_ROOT = path.join(PACKAGE_ROOT, 'artifacts');
const TRACE_CATEGORIES = [
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'loading',
  'navigation',
  'blink.user_timing',
  'v8.execute',
  'disabled-by-default-v8.cpu_profiler',
].join(',');
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

function normalizeHeaders(headers = {}) {
  return Object.entries(headers).map(([name, value]) => ({
    name,
    value: Array.isArray(value) ? value.join(', ') : String(value),
  }));
}

function serializeRemoteObject(remoteObject = {}) {
  return {
    type: remoteObject.type || null,
    subtype: remoteObject.subtype || null,
    className: remoteObject.className || null,
    description: remoteObject.description || null,
    value: remoteObject.value ?? null,
    unserializableValue: remoteObject.unserializableValue || null,
  };
}

function serializeResponse(response = {}) {
  return {
    url: response.url || null,
    status: response.status ?? null,
    statusText: response.statusText || '',
    mimeType: response.mimeType || null,
    protocol: response.protocol || null,
    remoteIPAddress: response.remoteIPAddress || null,
    remotePort: response.remotePort || null,
    fromDiskCache: response.fromDiskCache || false,
    fromServiceWorker: response.fromServiceWorker || false,
    fromPrefetchCache: response.fromPrefetchCache || false,
    headers: response.headers || {},
    headersText: response.headersText || null,
    encodedDataLength: response.encodedDataLength ?? null,
  };
}

function createConsoleCollector() {
  const entries = [];

  return {
    attach(Runtime, Log) {
      Runtime.consoleAPICalled((event) => {
        entries.push({
          channel: 'runtime',
          type: event.type,
          timestamp: event.timestamp ?? null,
          executionContextId: event.executionContextId ?? null,
          args: (event.args || []).map(serializeRemoteObject),
          stackTrace: event.stackTrace || null,
        });
      });

      Runtime.exceptionThrown((event) => {
        entries.push({
          channel: 'exception',
          timestamp: event.timestamp ?? null,
          exceptionDetails: event.exceptionDetails || null,
        });
      });

      Log.entryAdded((event) => {
        entries.push({
          channel: 'log',
          level: event.entry?.level || null,
          source: event.entry?.source || null,
          text: event.entry?.text || '',
          url: event.entry?.url || null,
          timestamp: event.entry?.timestamp || null,
          stackTrace: event.entry?.stackTrace || null,
        });
      });
    },
    getEntries() {
      return entries;
    },
  };
}

function createNetworkCollector() {
  const records = [];
  const activeRecords = new Map();

  return {
    attach(Network) {
      Network.requestWillBeSent((event) => {
        if (event.redirectResponse && activeRecords.has(event.requestId)) {
          const redirected = activeRecords.get(event.requestId);
          redirected.response = serializeResponse(event.redirectResponse);
          redirected.responseTimestamp = event.timestamp;
          redirected.endTimestamp = event.timestamp;
          redirected.redirectedTo = event.request.url;
          activeRecords.delete(event.requestId);
        }

        const record = {
          requestId: event.requestId,
          loaderId: event.loaderId,
          documentURL: event.documentURL,
          frameId: event.frameId || null,
          wallTime: event.wallTime ?? null,
          startTimestamp: event.timestamp,
          type: event.type || null,
          initiator: event.initiator || null,
          request: event.request,
          response: null,
          responseTimestamp: null,
          endTimestamp: null,
          encodedDataLength: null,
          errorText: null,
        };

        records.push(record);
        activeRecords.set(event.requestId, record);
      });

      Network.responseReceived((event) => {
        const record = activeRecords.get(event.requestId);
        if (!record) {
          return;
        }

        record.response = serializeResponse(event.response);
        record.responseTimestamp = event.timestamp;
        record.type = event.type || record.type;
      });

      Network.loadingFinished((event) => {
        const record = activeRecords.get(event.requestId);
        if (!record) {
          return;
        }

        record.endTimestamp = event.timestamp;
        record.encodedDataLength = event.encodedDataLength ?? null;
      });

      Network.loadingFailed((event) => {
        const record = activeRecords.get(event.requestId);
        if (!record) {
          return;
        }

        record.endTimestamp = event.timestamp;
        record.errorText = event.errorText || 'Unknown failure';
      });
    },
    buildHar({ pageUrl, pageTitle, startedAt }) {
      const entries = records
        .map((record, index) => {
          const responseTimestamp =
            record.responseTimestamp ?? record.startTimestamp;
          const endTimestamp = record.endTimestamp ?? responseTimestamp;
          const totalTime = Math.max(
            (endTimestamp - record.startTimestamp) * 1000,
            0,
          );
          const waitTime = Math.max(
            (responseTimestamp - record.startTimestamp) * 1000,
            0,
          );
          const receiveTime = Math.max(
            (endTimestamp - responseTimestamp) * 1000,
            0,
          );
          const startedDateTime = record.wallTime
            ? new Date(record.wallTime * 1000).toISOString()
            : new Date(startedAt.getTime() + index).toISOString();
          const responseStatus =
            record.response?.status ?? (record.errorText ? 0 : 200);
          const responseStatusText =
            record.response?.statusText ?? record.errorText ?? '';

          return {
            pageref: 'page_0',
            startedDateTime,
            time: totalTime,
            request: {
              method: record.request?.method || 'GET',
              url: record.request?.url || pageUrl || null,
              httpVersion: record.response?.protocol || 'unknown',
              headers: normalizeHeaders(record.request?.headers || {}),
              queryString: [],
              cookies: [],
              headersSize: -1,
              bodySize: record.request?.postData
                ? Buffer.byteLength(record.request.postData, 'utf8')
                : 0,
              postData: record.request?.postData
                ? {
                    mimeType:
                      record.request?.headers?.['Content-Type'] ||
                      'application/octet-stream',
                    text: record.request.postData,
                  }
                : undefined,
            },
            response: {
              status: responseStatus,
              statusText: responseStatusText,
              httpVersion: record.response?.protocol || 'unknown',
              headers: normalizeHeaders(record.response?.headers || {}),
              cookies: [],
              content: {
                size: record.encodedDataLength ?? 0,
                mimeType:
                  record.response?.mimeType || 'application/octet-stream',
              },
              redirectURL: record.response?.headers?.location || '',
              headersSize: record.response?.headersText
                ? Buffer.byteLength(record.response.headersText, 'utf8')
                : -1,
              bodySize: record.encodedDataLength ?? 0,
              _errorText: record.errorText,
            },
            cache: {},
            timings: {
              blocked: 0,
              dns: -1,
              connect: -1,
              ssl: -1,
              send: 0,
              wait: waitTime,
              receive: receiveTime,
            },
            serverIPAddress: record.response?.remoteIPAddress || null,
            _resourceType: record.type,
            _requestId: record.requestId,
          };
        })
        .sort((left, right) =>
          left.startedDateTime.localeCompare(right.startedDateTime),
        );

      return {
        log: {
          version: '1.2',
          creator: {
            name: '@repo/automation',
            version: '0.0.0',
          },
          pages: [
            {
              id: 'page_0',
              startedDateTime: startedAt.toISOString(),
              title: pageTitle || pageUrl || 'Captured page',
              pageTimings: {
                onContentLoad: null,
                onLoad: null,
              },
            },
          ],
          entries,
        },
      };
    },
  };
}

async function readProtocolStream(IO, handle) {
  let content = '';

  while (true) {
    const chunk = await IO.read({ handle });
    content += chunk.base64Encoded
      ? Buffer.from(chunk.data, 'base64').toString('utf8')
      : chunk.data;

    if (chunk.eof) {
      break;
    }
  }

  await IO.close({ handle });
  return content;
}

async function getPageDetails(Runtime) {
  try {
    const evaluation = await Runtime.evaluate({
      expression: `(() => ({ url: location.href, title: document.title, readyState: document.readyState }))()`,
      returnByValue: true,
    });

    return (
      evaluation.result?.value || { url: null, title: null, readyState: null }
    );
  } catch {
    return { url: null, title: null, readyState: null };
  }
}

async function getPerformancePayload(Runtime, Performance) {
  let browserMetrics = [];
  let runtimeMetrics = {
    navigationStart: null,
    lcpEntries: [],
    clsEntries: [],
    clsValue: 0,
    inpEntries: [],
    observerErrors: [],
  };

  try {
    const performanceMetrics = await Performance.getMetrics();
    browserMetrics = performanceMetrics.metrics || [];
  } catch {
    browserMetrics = [];
  }

  try {
    const evaluation = await Runtime.evaluate({
      expression: `(() => {
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
      })()`,
      returnByValue: true,
    });

    runtimeMetrics = evaluation.result?.value || runtimeMetrics;
  } catch {
    runtimeMetrics = runtimeMetrics;
  }

  const metricMap = Object.fromEntries(
    browserMetrics.map((metric) => [metric.name, metric.value]),
  );
  const inpCandidates = (runtimeMetrics.inpEntries || []).filter(
    (entry) => Number(entry.interactionId) > 0,
  );
  const lcpEntry = (runtimeMetrics.lcpEntries || []).at(-1) || null;

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

async function buildMetadata(mode, artifactsDir, browserInfo, extra = {}) {
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

async function connectToFreshTarget() {
  const target = await CDP.New({ host: HOST, port: PORT, url: 'about:blank' });
  try {
    const client = await CDP({ host: HOST, port: PORT, target });
    return { target, client };
  } catch (error) {
    await closeTarget(target);
    throw error;
  }
}

async function connectToExistingTarget() {
  const targets = await CDP.List({ host: HOST, port: PORT });
  const target = [...targets]
    .reverse()
    .find(
      (candidate) =>
        candidate.type === 'page' && !candidate.url.startsWith('devtools://'),
    );

  if (!target) {
    throw new Error('No existing Chrome page target found.');
  }

  const client = await CDP({ host: HOST, port: PORT, target });
  return { target, client };
}

async function closeTarget(target) {
  if (!target?.id) {
    return;
  }

  try {
    await CDP.Close({ host: HOST, port: PORT, id: target.id });
  } catch {
    // Ignore target cleanup failures.
  }
}

async function closeClient(client) {
  if (!client) {
    return;
  }

  try {
    await client.close();
  } catch {
    // Ignore client cleanup failures.
  }
}

async function captureSnapshot() {
  const artifactsDir = ensureArtifactsDirectory('snapshot');
  const browserInfo = await httpGetJson('/json/version');
  const pages = await httpGetJson('/json/list');
  const metadata = await buildMetadata('snapshot', artifactsDir, browserInfo, {
    pageCount: pages.length,
    url: null,
  });

  writeJson(artifactsDir, 'metadata.json', metadata);
  writeJson(artifactsDir, 'version.json', browserInfo);
  writeJson(artifactsDir, 'pages.json', pages);

  console.log(`Saved snapshot artifacts to ${artifactsDir}`);
}

async function recordTrace(url, options = {}) {
  const targetUrl = requireUrl('record-trace', url);
  const durationMs = resolveDurationMs(options);
  const artifactsDir = ensureArtifactsDirectory('trace');
  const browserInfo = await httpGetJson('/json/version');
  const { target, client } = await connectToFreshTarget();

  try {
    const { Page, Network, Runtime, Log, Performance, Tracing, IO } = client;
    const consoleCollector = createConsoleCollector();
    const networkCollector = createNetworkCollector();

    consoleCollector.attach(Runtime, Log);
    networkCollector.attach(Network);

    await Promise.all([
      Page.enable(),
      Network.enable(),
      Runtime.enable(),
      Log.enable(),
      Performance.enable(),
      Page.addScriptToEvaluateOnNewDocument({
        source: PERFORMANCE_OBSERVER_SOURCE,
      }),
    ]);

    const traceTimeoutMs = durationMs + 30_000;
    const traceComplete = Promise.race([
      new Promise((resolve, reject) => {
        Tracing.tracingComplete(async (event) => {
          try {
            resolve(await readProtocolStream(IO, event.stream));
          } catch (error) {
            reject(error);
          }
        });
      }),
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Timed out waiting for tracingComplete after ${traceTimeoutMs}ms`,
              ),
            ),
          traceTimeoutMs,
        ),
      ),
    ]);

    await Tracing.start({
      categories: TRACE_CATEGORIES,
      transferMode: 'ReturnAsStream',
    });

    await Page.navigate({ url: targetUrl });
    await sleep(durationMs);
    await Tracing.end();

    const [traceContent, pageDetails, performancePayload] = await Promise.all([
      traceComplete,
      getPageDetails(Runtime),
      getPerformancePayload(Runtime, Performance),
    ]);

    const metadata = await buildMetadata('trace', artifactsDir, browserInfo, {
      url: pageDetails.url || targetUrl,
      title: pageDetails.title || null,
      durationMs,
      requestCount: networkCollector.buildHar({
        pageUrl: pageDetails.url || targetUrl,
        pageTitle: pageDetails.title || null,
        startedAt: new Date(),
      }).log.entries.length,
      consoleMessageCount: consoleCollector.getEntries().length,
    });
    const har = networkCollector.buildHar({
      pageUrl: pageDetails.url || targetUrl,
      pageTitle: pageDetails.title || null,
      startedAt: new Date(new Date(metadata.capturedAt).getTime() - durationMs),
    });

    writeJson(artifactsDir, 'metadata.json', metadata);
    writeJson(artifactsDir, 'har.json', har);
    writeJson(artifactsDir, 'console.json', {
      entries: consoleCollector.getEntries(),
    });
    writeJson(artifactsDir, 'performance.json', performancePayload);

    fs.writeFileSync(path.join(artifactsDir, 'trace.json'), traceContent);

    console.log(`Saved trace artifacts to ${artifactsDir}`);
  } finally {
    await closeClient(client);
    await closeTarget(target);
  }
}

async function recordPerformance(url, options = {}) {
  const targetUrl = requireUrl('record-performance', url);
  const durationMs = resolveDurationMs(options);
  const artifactsDir = ensureArtifactsDirectory('performance');
  const browserInfo = await httpGetJson('/json/version');
  const { target, client } = await connectToFreshTarget();

  try {
    const { Page, Runtime, Performance } = client;

    await Promise.all([
      Page.enable(),
      Runtime.enable(),
      Performance.enable(),
      Page.addScriptToEvaluateOnNewDocument({
        source: PERFORMANCE_OBSERVER_SOURCE,
      }),
    ]);

    await Page.navigate({ url: targetUrl });
    await sleep(durationMs);

    const [pageDetails, performancePayload] = await Promise.all([
      getPageDetails(Runtime),
      getPerformancePayload(Runtime, Performance),
    ]);
    const metadata = await buildMetadata(
      'performance',
      artifactsDir,
      browserInfo,
      {
        url: pageDetails.url || targetUrl,
        title: pageDetails.title || null,
        durationMs,
      },
    );

    writeJson(artifactsDir, 'metadata.json', metadata);
    writeJson(artifactsDir, 'performance.json', performancePayload);

    console.log(`Saved performance artifacts to ${artifactsDir}`);
  } finally {
    await closeClient(client);
    await closeTarget(target);
  }
}

async function recordConsole(options = {}) {
  const durationMs = resolveDurationMs(options);
  const artifactsDir = ensureArtifactsDirectory('console');
  const browserInfo = await httpGetJson('/json/version');
  const { client } = await connectToExistingTarget();

  try {
    const { Runtime, Log } = client;
    const consoleCollector = createConsoleCollector();

    consoleCollector.attach(Runtime, Log);
    await Promise.all([Runtime.enable(), Log.enable()]);
    await sleep(durationMs);

    const pageDetails = await getPageDetails(Runtime);
    const metadata = await buildMetadata('console', artifactsDir, browserInfo, {
      url: pageDetails.url || null,
      title: pageDetails.title || null,
      durationMs,
      consoleMessageCount: consoleCollector.getEntries().length,
    });

    writeJson(artifactsDir, 'metadata.json', metadata);
    writeJson(artifactsDir, 'console.json', {
      entries: consoleCollector.getEntries(),
    });

    console.log(`Saved console artifacts to ${artifactsDir}`);
  } finally {
    await closeClient(client);
  }
}

function uploadArtifacts() {
  if (!fs.existsSync(ARTIFACTS_ROOT)) {
    throw new Error('No artifacts found.');
  }

  const tar = path.join(PACKAGE_ROOT, `artifacts-${Date.now()}.tar.gz`);
  execSync(`tar -czf "${tar}" -C "${ARTIFACTS_ROOT}" .`);
  console.log(`Packaged artifacts to ${tar}`);
}

function usage() {
  console.log('copilot-devtools CLI');
  console.log('Usage: copilot-devtools <command> [url] [--duration <seconds>]');
  console.log('Commands:');
  console.log('  capture-snapshot');
  console.log('  record-trace <url>');
  console.log('  record-performance <url>');
  console.log('  record-console');
  console.log('  upload-artifacts');
}

async function main() {
  const cmd = process.argv[2];
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
