/**
 * Collect Web Vitals from injected observers and CDP Performance metrics.
 *
 * @param {import('playwright-core').Page} page
 * @param {import('playwright-core').CDPSession} cdpSession
 * @returns {Promise<object>}
 */
export async function getPerformanceMetrics(page, cdpSession) {
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
      const state = window.__BROWSER_CAPTURE_PERF__ || {
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
