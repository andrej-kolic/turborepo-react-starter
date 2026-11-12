// Shared types for capture artifacts, imported from JSDoc as `import('../types.js')`.

/** The element an interaction targeted, as read by the in-page recorder. */
export type RecordedElement = {
  tag?: string | null;
  id?: string | null;
  testId?: string | null;
  ariaLabel?: string | null;
  role?: string | null;
  text?: string | null;
  inputType?: string | null;
  name?: string | null;
};

/** React component source for an interaction target, when the page exposes it. */
export type ReactInfo = {
  componentName: string | null;
  fileName?: string;
  scriptUrl?: string;
  lineNumber?: number;
  columnNumber?: number;
  originalSource?: { source: string; line: number; column: number };
};

/** One recorded user interaction. */
export type Interaction = {
  type: 'click' | 'fill' | 'check' | 'uncheck' | 'selectOption' | 'navigate';
  element?: RecordedElement | null;
  value?: string;
  url?: string;
  react?: ReactInfo | null;
  timestamp?: number;
};

/** Web Vitals state the performance observer keeps on `window`. */
export type PerfObserverState = {
  navigationStart: number | null;
  lcpEntries: {
    entryType: string;
    startTime: number;
    duration: number;
    size: number | null;
    url: string | null;
    id: string | null;
    renderTime: number | null;
    loadTime: number | null;
  }[];
  clsEntries: {
    entryType: string;
    startTime: number;
    value: number;
    hadRecentInput: boolean;
  }[];
  clsValue: number;
  inpEntries: {
    entryType: string;
    name: string;
    startTime: number;
    duration: number;
    interactionId: number;
  }[];
  observerErrors: { type: string; message: string }[];
};

/** Per-capture fields a capture mode adds to `metadata.json`. */
export type CaptureDetails = {
  url?: string | null;
  title?: string | null;
  durationMs?: number;
  attach?: boolean;
  pageCount?: number;
  requestCount?: number;
  consoleMessageCount?: number;
  interactionCount?: number;
  traceFormat?: string;
  traceScope?: string;
};

/** Contents of `metadata.json`. */
export type CaptureMetadata = CaptureDetails & {
  mode: string;
  capturedAt: string;
  artifactDirectory: string;
  branch: string | null;
  commit: string | null;
  actor: string | null;
  triggerEvent: string;
  chrome: {
    browser: string | null;
    protocolVersion: string | null;
    userAgent: string | null;
  };
  devtoolsEndpoint: string;
};

export type WebVitals = { lcp: number | null; cls: number; inp: number | null };

/** Contents of `performance.json`. */
export type PerformancePayload = {
  browserMetrics: { name: string; value: number }[];
  metricMap: Record<string, number>;
  webVitals: WebVitals;
  runtimeMetrics: PerfObserverState & {
    navigation: Record<string, string | number>[];
    paints: { name: string; startTime: number }[];
  };
};

export type CaptureResult = { artifactsDir: string; metadata: CaptureMetadata };

export type ConsoleResult = CaptureResult & { consoleMessageCount: number };

export type TraceResult = CaptureResult & {
  webVitals: WebVitals;
  requestCount: number;
  consoleMessageCount: number;
};

export type PerformanceResult = CaptureResult & {
  webVitals: WebVitals;
  browserMetricsCount: number;
};

export type InteractionsResult = CaptureResult & {
  interactionCount: number;
  testFile: string;
};

type NameValue = { name: string; value: string };

/**
 * Artifact files as the sanitizers read them. Every field is optional: the
 * `sanitize_artifacts` MCP tool accepts any directory.
 */
export type ConsoleArtifact = {
  entries?: { text?: string; stack?: unknown }[];
};

export type HarArtifact = {
  log?: {
    entries?: {
      request?: {
        headers?: NameValue[];
        queryString?: NameValue[];
        postData?: { params?: NameValue[] };
      };
      response?: { headers?: NameValue[] } | null;
    }[];
  };
};

export type InteractionsArtifact = {
  interactions?: (Omit<Interaction, 'value'> & {
    value?: string | number | boolean | null;
  })[];
};

export type MetadataArtifact = Record<string, unknown>;
