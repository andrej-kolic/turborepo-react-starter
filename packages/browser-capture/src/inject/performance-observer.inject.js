(() => {
  const perfWindow =
    /** @type {Window & { __BROWSER_CAPTURE_PERF__?: import('../types.js').PerfObserverState }} */ (
      window
    );
  if (perfWindow.__BROWSER_CAPTURE_PERF__) return;

  /** @type {import('../types.js').PerfObserverState} */
  const state = {
    navigationStart: performance.timeOrigin,
    lcpEntries: [],
    clsEntries: [],
    clsValue: 0,
    inpEntries: [],
    observerErrors: [],
  };
  perfWindow.__BROWSER_CAPTURE_PERF__ = state;

  /**
   * @param {string} type
   * @param {(entries: PerformanceEntryList) => void} callback
   * @param {PerformanceObserverInit & { durationThreshold?: number }} options
   */
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
        ...entries
          .filter((entry) => entry instanceof LargestContentfulPaint)
          .map((entry) => ({
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
      const shifts = entries.filter(
        // Layout Instability entries are not in TypeScript's DOM lib.
        /** @returns {entry is PerformanceEntry & { value: number, hadRecentInput: boolean }} */
        (entry) =>
          'value' in entry &&
          typeof entry.value === 'number' &&
          'hadRecentInput' in entry &&
          typeof entry.hadRecentInput === 'boolean',
      );
      for (const entry of shifts) {
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
        ...entries
          .filter((entry) => entry instanceof PerformanceEventTiming)
          .map((entry) => ({
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
})();
