import { buildMetadata } from '../artifact-io/metadata.js';
import { ensureArtifactsDirectory } from '../artifact-io/paths.js';
import { writeJson } from '../artifact-io/write.js';
import {
  collectPerformancePayload,
  gotoTarget,
  runCaptureSession,
  withIsolatedCapture,
} from './capture-session.js';
import { fetchCdpJson, withAttachedSession } from '@repo/browser-tools/cdp';
import { log } from '../config/log.js';
import { isSanitizeEnabled } from '../config/runtime.js';
import { injectScript } from './inject-page.js';
import { performanceObserverInject } from '../inject/paths.js';
import { sanitizeArtifacts } from '../sanitize/index.js';

/**
 * Collect LCP, CLS, INP, and CDP browser metrics for a URL.
 * Dispatches to attach or isolated mode via runCaptureSession.
 *
 * @param {string | undefined} url
 * @param {Record<string, string | boolean>} [options]
 * @returns {Promise<object>}
 */
export async function recordPerformance(url, options = {}) {
  return runCaptureSession({
    command: 'record-performance',
    url,
    options,
    attachedFn: recordPerformanceAttached,
    isolatedFn: recordPerformanceIsolated,
  });
}

async function recordPerformanceAttached(targetUrl, durationMs) {
  const artifactsDir = ensureArtifactsDirectory('performance');
  const browserInfo = await fetchCdpJson('/json/version');

  return withAttachedSession(targetUrl, async ({ page }) => {
    await injectScript(page, performanceObserverInject);
    await page.waitForTimeout(durationMs);

    const { pageDetails, performancePayload } =
      await collectPerformancePayload(page);

    const metadata = buildMetadata('performance', artifactsDir, browserInfo, {
      url: pageDetails.url || targetUrl,
      title: pageDetails.title || null,
      durationMs,
      attach: true,
    });

    writeJson(artifactsDir, 'metadata.json', metadata);
    writeJson(artifactsDir, 'performance.json', performancePayload);

    if (isSanitizeEnabled()) sanitizeArtifacts(artifactsDir);
    log(`Saved performance artifacts to ${artifactsDir}`);

    return {
      artifactsDir,
      metadata,
      webVitals: performancePayload.webVitals,
      browserMetricsCount: performancePayload.browserMetrics.length,
    };
  });
}

async function recordPerformanceIsolated(targetUrl, durationMs) {
  const artifactsDir = ensureArtifactsDirectory('performance');
  const browserInfo = await fetchCdpJson('/json/version');

  return withIsolatedCapture(async ({ context }) => {
    const page = await context.newPage();
    await page.addInitScript({ path: performanceObserverInject });
    await gotoTarget(page, targetUrl);
    await page.waitForTimeout(durationMs);

    const { pageDetails, performancePayload } =
      await collectPerformancePayload(page);

    const metadata = buildMetadata('performance', artifactsDir, browserInfo, {
      url: pageDetails.url || targetUrl,
      title: pageDetails.title || null,
      durationMs,
    });

    writeJson(artifactsDir, 'metadata.json', metadata);
    writeJson(artifactsDir, 'performance.json', performancePayload);

    if (isSanitizeEnabled()) sanitizeArtifacts(artifactsDir);
    log(`Saved performance artifacts to ${artifactsDir}`);

    return {
      artifactsDir,
      metadata,
      webVitals: performancePayload.webVitals,
      browserMetricsCount: performancePayload.browserMetrics.length,
    };
  });
}
