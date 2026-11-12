import fs from 'node:fs';
import path from 'node:path';
import { buildMetadata, fetchBrowserInfo } from '../artifact-io/metadata.js';
import { ensureArtifactsDirectory } from '../artifact-io/paths.js';
import { readJson } from '../artifact-io/read.js';
import { writeJson } from '../artifact-io/write.js';
import {
  getPageDetails,
  gotoTarget,
  runCaptureSession,
  withIsolatedCapture,
} from './capture-session.js';
import { withAttachedSession } from '@repo/browser-tools/cdp';
import { log } from '../config/log.js';
import { isSanitizeEnabled } from '../config/runtime.js';
import { injectScript } from './inject-page.js';
import { interactionRecorderInject } from '../inject/paths.js';
import { resolveSourceLocation } from '../interactions/source-map.js';
import { generatePlaywrightTest } from '../interactions/test-generator.js';
import { sanitizeArtifacts } from '../sanitize/index.js';

/**
 * Record user interactions and generate a Playwright test file.
 * Dispatches to attach or isolated mode via runCaptureSession.
 *
 * @param {string | undefined} url
 * @param {Record<string, string | boolean>} [options]
 * @returns {Promise<import('../types.js').InteractionsResult>}
 */
export async function recordInteractions(url, options = {}) {
  return runCaptureSession({
    command: 'record-interactions',
    url,
    options,
    attachedFn: recordInteractionsAttached,
    isolatedFn: recordInteractionsIsolated,
  });
}

/**
 * @param {string} targetUrl
 * @param {number} durationMs
 */
async function recordInteractionsAttached(targetUrl, durationMs) {
  const artifactsDir = ensureArtifactsDirectory('interactions');
  const browserInfo = await fetchBrowserInfo();

  return withAttachedSession(targetUrl, async ({ page }) => {
    const interactions = await setupInteractionRecorder(page, 'inject');
    return finalizeInteractions(
      page,
      targetUrl,
      durationMs,
      artifactsDir,
      browserInfo,
      interactions,
      { attach: true },
    );
  });
}

/**
 * @param {string} targetUrl
 * @param {number} durationMs
 */
async function recordInteractionsIsolated(targetUrl, durationMs) {
  const artifactsDir = ensureArtifactsDirectory('interactions');
  const browserInfo = await fetchBrowserInfo();

  return withIsolatedCapture(async ({ context }) => {
    const page = await context.newPage();
    const interactions = await setupInteractionRecorder(page, 'init');
    await gotoTarget(page, targetUrl);
    return finalizeInteractions(
      page,
      targetUrl,
      durationMs,
      artifactsDir,
      browserInfo,
      interactions,
    );
  });
}

/**
 * @param {import('playwright-core').Page} page
 * @param {'init' | 'inject'} mode
 */
async function setupInteractionRecorder(page, mode) {
  /** @type {import('../types.js').Interaction[]} */
  const interactions = [];
  await page.exposeFunction(
    '__recordInteraction',
    /** @param {import('../types.js').Interaction} event */
    (event) => {
      interactions.push({ ...event, timestamp: Date.now() });
    },
  );

  if (mode === 'init') {
    await page.addInitScript({ path: interactionRecorderInject });
  } else {
    await injectScript(page, interactionRecorderInject);
  }

  return interactions;
}

/**
 * @param {import('playwright-core').Page} page
 * @param {string} targetUrl
 * @param {number} durationMs
 * @param {string} artifactsDir
 * @param {import('../artifact-io/metadata.js').BrowserVersionInfo} browserInfo
 * @param {import('../types.js').Interaction[]} interactions
 * @param {{ attach?: boolean }} [sessionInfo]
 */
async function finalizeInteractions(
  page,
  targetUrl,
  durationMs,
  artifactsDir,
  browserInfo,
  interactions,
  sessionInfo = {},
) {
  log(`Recording interactions on ${targetUrl} for ${durationMs / 1000}s...`);
  log('Interact with the page. Interactions are captured automatically.');

  await page.waitForTimeout(durationMs).catch(() => {});

  const activeInput = await page
    .evaluate(() => {
      const el = document.activeElement;
      if (
        !(el instanceof HTMLInputElement) &&
        !(el instanceof HTMLTextAreaElement)
      ) {
        return null;
      }
      const tag = el.tagName.toLowerCase();
      if (
        (tag === 'input' || tag === 'textarea') &&
        el.type !== 'checkbox' &&
        el.type !== 'radio' &&
        el.type !== 'file'
      ) {
        return {
          tag,
          value: el.value,
          id: el.id || null,
          testId: el.getAttribute('data-testid') || null,
          name: el.getAttribute('name') || null,
        };
      }
      return null;
    })
    .catch(() => null);

  if (activeInput?.value) {
    const last = interactions.at(-1);
    const isDuplicate =
      last?.type === 'fill' && last?.value === activeInput.value;
    if (!isDuplicate) {
      interactions.push({
        type: 'fill',
        element: {
          tag: activeInput.tag,
          id: activeInput.id,
          testId: activeInput.testId,
          name: activeInput.name,
        },
        value: activeInput.value,
        react: null,
        timestamp: Date.now(),
      });
    }
  }

  for (const interaction of interactions) {
    if (interaction.react?.scriptUrl && !interaction.react?.fileName) {
      const resolved = await resolveSourceLocation(
        interaction.react.scriptUrl,
        interaction.react.lineNumber ?? 1,
        interaction.react.columnNumber ?? 0,
      );
      if (resolved) interaction.react.originalSource = resolved;
    }
  }

  const pageDetails = await getPageDetails(page);

  const resolvedUrl = pageDetails.url || targetUrl;
  const metadata = buildMetadata('interactions', artifactsDir, browserInfo, {
    url: resolvedUrl,
    title: pageDetails.title || null,
    durationMs,
    interactionCount: interactions.length,
    ...sessionInfo,
  });

  writeJson(artifactsDir, 'metadata.json', metadata);
  writeJson(artifactsDir, 'interactions.json', { interactions });

  if (isSanitizeEnabled()) sanitizeArtifacts(artifactsDir);

  /** @type {{ interactions?: import('../types.js').Interaction[] }} */
  const sanitized = isSanitizeEnabled()
    ? readJson(path.join(artifactsDir, 'interactions.json'))
    : { interactions };
  const sanitizedInteractions = sanitized.interactions ?? [];
  const testCode = generatePlaywrightTest(resolvedUrl, sanitizedInteractions);
  const testFilePath = path.join(artifactsDir, 'generated.test.ts');
  fs.writeFileSync(testFilePath, testCode, 'utf8');

  log(`Captured ${interactions.length} interaction(s).`);
  log(`Generated test: ${testFilePath}`);
  log(`Saved interaction artifacts to ${artifactsDir}`);

  return {
    artifactsDir,
    metadata,
    interactionCount: interactions.length,
    testFile: testFilePath,
  };
}
