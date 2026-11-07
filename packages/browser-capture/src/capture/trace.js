import path from 'node:path';
import { buildMetadata } from '../artifact-io/metadata.js';
import { ensureArtifactsDirectory } from '../artifact-io/paths.js';
import { writeJson } from '../artifact-io/write.js';
import {
  collectPerformancePayload,
  gotoTarget,
  runCaptureSession,
  withIsolatedCapture,
} from './capture-session.js';
import {
  attachConsoleListeners,
  fetchCdpJson,
  withAttachedSession,
} from '@repo/browser-tools/cdp';
import { log } from '../config/log.js';
import { isSanitizeEnabled } from '../config/runtime.js';
import { HarRecorder } from './har-recorder.js';
import { injectScript } from './inject-page.js';
import { performanceObserverInject } from '../inject/paths.js';
import { sanitizeArtifacts } from '../sanitize/index.js';

/**
 * Record HAR, Playwright trace, console, and Web Vitals for a URL.
 * Dispatches to attach or isolated mode via runCaptureSession.
 *
 * @param {string | undefined} url
 * @param {Record<string, string | boolean>} [options]
 * @returns {Promise<object>}
 */
export async function recordTrace(url, options = {}) {
  return runCaptureSession({
    command: 'record-trace',
    url,
    options,
    attachedFn: recordTraceAttached,
    isolatedFn: recordTraceIsolated,
  });
}

async function recordTraceAttached(targetUrl, durationMs) {
  const artifactsDir = ensureArtifactsDirectory('trace');
  const browserInfo = await fetchCdpJson('/json/version');
  const harPath = path.join(artifactsDir, 'har.json');
  const tracePath = path.join(artifactsDir, 'trace.zip');

  return withAttachedSession(targetUrl, async ({ page }) => {
    const context = page.context();
    const harRecorder = new HarRecorder();
    harRecorder.attach(page);
    let tracingStarted = false;
    let requestCount = 0;
    /** @type {ReturnType<typeof attachConsoleListeners> | null} */
    let consoleListener = null;

    page.on('request', () => {
      requestCount += 1;
    });

    try {
      // TODO: switch to page-scoped tracing when Playwright supports it over CDP
      // (https://github.com/microsoft/playwright/issues/34769). Until then,
      // context.tracing includes all tabs in the Chrome browser context.
      await context.tracing.start({ screenshots: true, snapshots: true });
      tracingStarted = true;

      await injectScript(page, performanceObserverInject);
      consoleListener = attachConsoleListeners(page, { mode: 'full' });

      await page.waitForTimeout(durationMs);

      const { pageDetails, performancePayload } =
        await collectPerformancePayload(page);

      await context.tracing.stop({ path: tracePath });
      tracingStarted = false;
      harRecorder.write(harPath);

      const consoleEntries = consoleListener.getEntries();
      const metadata = buildMetadata('trace', artifactsDir, browserInfo, {
        url: pageDetails.url || targetUrl,
        title: pageDetails.title || null,
        durationMs,
        requestCount,
        consoleMessageCount: consoleEntries.length,
        traceFormat: 'playwright-zip',
        traceScope: 'browser-context',
        attach: true,
      });

      writeJson(artifactsDir, 'metadata.json', metadata);
      writeJson(artifactsDir, 'console.json', { entries: consoleEntries });
      writeJson(artifactsDir, 'performance.json', performancePayload);

      if (isSanitizeEnabled()) sanitizeArtifacts(artifactsDir);
      log(`Saved trace artifacts to ${artifactsDir}`);

      return {
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
      consoleListener?.detach();
      harRecorder.detach();
    }
  });
}

async function recordTraceIsolated(targetUrl, durationMs) {
  const artifactsDir = ensureArtifactsDirectory('trace');
  const browserInfo = await fetchCdpJson('/json/version');
  const harPath = path.join(artifactsDir, 'har.json');
  const tracePath = path.join(artifactsDir, 'trace.zip');

  return withIsolatedCapture(
    { recordHar: { path: harPath, content: 'omit' } },
    async ({ context }) => {
      let tracingStarted = false;
      let requestCount = 0;
      /** @type {ReturnType<typeof attachConsoleListeners> | null} */
      let consoleListener = null;

      try {
        await context.tracing.start({ screenshots: true, snapshots: true });
        tracingStarted = true;

        const page = await context.newPage();
        await page.addInitScript({ path: performanceObserverInject });
        consoleListener = attachConsoleListeners(page, { mode: 'full' });
        page.on('request', () => {
          requestCount += 1;
        });

        await gotoTarget(page, targetUrl);
        await page.waitForTimeout(durationMs);

        const { pageDetails, performancePayload } =
          await collectPerformancePayload(page);

        await context.tracing.stop({ path: tracePath });
        tracingStarted = false;

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

        return {
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
        consoleListener?.detach();
      }
    },
  );
}
