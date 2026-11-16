/**
 * Lets an E2E test read the spans (page views with their Web Vitals) the app sends to Sentry,
 * without a real Sentry project: requests are intercepted in the browser and never leave it.
 *
 * Used by `tests/web-vitals.spec.ts` (`pnpm e2e:sentry`), and by `fixtures/app-target.ts`, which
 * answers Sentry's requests in every test.
 */

import type { Page } from '@playwright/test';

/**
 * The URL the Sentry SDK sends everything to, `<DSN host>/api/<project id>/envelope/`, on any host:
 * sentry.io, a regional one like `o<org>.ingest.de.sentry.io`, or a self-hosted Sentry.
 */
export const SENTRY_ENVELOPE = /\/api\/\d+\/envelope\//;

/** The answer a test gives in Sentry's place: HTTP 200 with an empty JSON body, as Sentry answers a stored envelope. */
export const SENTRY_REPLY = { status: 200, body: '{}' };

type SpanAttributes = Record<string, { value: unknown } | undefined>;

/** A span as Sentry's browser SDK sends it, reduced to what tests read. */
export type SentrySpan = {
  name: string;
  attributes: SpanAttributes;
};

/**
 * Answers every request to Sentry with HTTP 200 instead of sending it, and collects the spans they carry.
 * Call before `page.goto`.
 *
 * @returns the spans received so far; the array grows as the page sends more
 */
export async function captureSentrySpans(page: Page): Promise<SentrySpan[]> {
  const spans: SentrySpan[] = [];
  await page.route(SENTRY_ENVELOPE, async (route) => {
    // An envelope is one JSON value per line; a span item's payload holds its spans in `items`.
    for (const line of (route.request().postData() ?? '').split('\n')) {
      if (!line.startsWith('{')) continue;
      const value: unknown = JSON.parse(line);
      if (isSpanPayload(value)) spans.push(...value.items);
    }
    await route.fulfill(SENTRY_REPLY);
  });
  return spans;
}

function isSpanPayload(value: unknown): value is { items: SentrySpan[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    Array.isArray(value.items)
  );
}

/** The value of a span attribute, such as `sentry.op`. */
export function spanAttribute(span: SentrySpan, key: string): unknown {
  return span.attributes[key]?.value;
}
