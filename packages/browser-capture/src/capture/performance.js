import { buildMetadata } from '../artifact-io/metadata.js';
import { ensureArtifactsDirectory } from '../artifact-io/paths.js';
import { writeJson } from '../artifact-io/write.js';
import { requireUrl, resolveDurationMs } from '../cli/args.js';
import { connectCDP } from '../cdp/connect.js';
import { httpGetJson } from '../cdp/http.js';
import { log } from '../config/log.js';
import { isSanitizeEnabled } from '../config/runtime.js';
import { performanceObserverInject } from '../inject/paths.js';
import { getPerformanceMetrics } from '../performance/metrics.js';
import { sanitizeArtifacts } from '../sanitize/index.js';

export async function recordPerformance(url, options = {}) {
  const targetUrl = requireUrl('record-performance', url);
  const durationMs = resolveDurationMs(options);
  const artifactsDir = ensureArtifactsDirectory('performance');
  const browserInfo = await httpGetJson('/json/version');

  const browser = await connectCDP();
  const context = await browser.newContext();
  let captureResult = null;

  try {
    const page = await context.newPage();
    await page.addInitScript({ path: performanceObserverInject });

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

    if (isSanitizeEnabled()) sanitizeArtifacts(artifactsDir);
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
