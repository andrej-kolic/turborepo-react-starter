import { expect, test } from '../fixtures/app-target';
import {
  captureSentrySpans,
  SENTRY_ENVELOPE,
  spanAttribute,
} from '../lib/sentry-spans';
import { AppPage } from '../pages/app.page';

// @features: runs only on the features build, which has a DSN and samples every visit; see docs/template/build-profiles.md.
test.describe('web vitals', { tag: '@features' }, () => {
  test('sends LCP, CLS and INP named after the page once the page is hidden', async ({
    page,
  }) => {
    const spans = await captureSentrySpans(page);
    // Sentry loads after the app and sends its first request as it starts; an earlier click would go unseen.
    const sentryStarted = page.waitForRequest(SENTRY_ENVELOPE);
    const appPage = new AppPage(page);
    await appPage.goto();
    await appPage.expectRegisteredRegionsVisible();
    await sentryStarted;

    // INP needs a real interaction; Sentry sends CLS and INP only when the page is hidden.
    await appPage.header.click();
    await appPage.waitForFirstInputRecorded();
    await appPage.hide();

    const vitals = [
      'ui.webvital.lcp',
      'ui.webvital.cls',
      'ui.interaction.click',
    ];
    await expect
      .poll(() =>
        vitals.map((op) =>
          spans
            .filter((span) => spanAttribute(span, 'sentry.op') === op)
            .map((span) => spanAttribute(span, 'sentry.segment.name')),
        ),
      )
      .toEqual([['/'], ['/'], ['/']]);
  });
});
