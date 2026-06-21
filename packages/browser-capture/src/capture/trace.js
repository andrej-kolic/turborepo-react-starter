import path from 'node:path';
import { buildMetadata } from '../artifact-io/metadata.js';
import { ensureArtifactsDirectory } from '../artifact-io/paths.js';
import { writeJson } from '../artifact-io/write.js';
import { requireUrl, resolveDurationMs } from '../cli/args.js';
import {
  attachConsoleListeners,
  connectOverCDP,
  fetchCdpJson,
} from '@repo/browser-tools/cdp';
import { log } from '../config/log.js';
import { isSanitizeEnabled } from '../config/runtime.js';
import { performanceObserverInject } from '../inject/paths.js';
import { getPerformanceMetrics } from '../performance/metrics.js';
import { sanitizeArtifacts } from '../sanitize/index.js';

export async function recordTrace(url, options = {}) {
  const targetUrl = requireUrl('record-trace', url);
  const durationMs = resolveDurationMs(options);
  const artifactsDir = ensureArtifactsDirectory('trace');
  const browserInfo = await fetchCdpJson('/json/version');
  const harPath = path.join(artifactsDir, 'har.json');
  const tracePath = path.join(artifactsDir, 'trace.zip');

  const browser = await connectOverCDP();
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
    await page.addInitScript({ path: performanceObserverInject });
    const consoleListener = attachConsoleListeners(page, { mode: 'full' });
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
    await context.close();

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

    if (isSanitizeEnabled()) sanitizeArtifacts(artifactsDir);
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
