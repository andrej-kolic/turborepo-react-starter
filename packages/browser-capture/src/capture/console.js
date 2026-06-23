import { buildMetadata } from '../artifact-io/metadata.js';
import { ensureArtifactsDirectory, sleep } from '../artifact-io/paths.js';
import { writeJson } from '../artifact-io/write.js';
import { captureOptions, requireUrl } from '../cli/args.js';
import { getPageDetails, withCdpBrowser } from './capture-session.js';
import {
  attachConsoleListeners,
  fetchCdpJson,
  findRecentPage,
  withAttachedSession,
} from '@repo/browser-tools/cdp';
import { log } from '../config/log.js';
import { isSanitizeEnabled } from '../config/runtime.js';
import { sanitizeArtifacts } from '../sanitize/index.js';

/**
 * Monitor console messages for a duration on the attached tab or most recent page.
 *
 * @param {Record<string, string | boolean>} [options]
 * @param {string | undefined} url  required when --attach is set
 * @returns {Promise<object>}
 */
export async function recordConsole(options = {}, url) {
  const { durationMs, attach } = captureOptions(options);

  if (attach) {
    const targetUrl = requireUrl('record-console', url);
    return recordConsoleAttached(targetUrl, durationMs);
  }

  return recordConsoleRecent(durationMs);
}

async function recordConsoleAttached(url, durationMs) {
  const artifactsDir = ensureArtifactsDirectory('console');
  const browserInfo = await fetchCdpJson('/json/version');

  return withAttachedSession(url, async ({ page }) =>
    captureConsoleFromPage(page, durationMs, artifactsDir, browserInfo, {
      attach: true,
    }),
  );
}

async function recordConsoleRecent(durationMs) {
  const artifactsDir = ensureArtifactsDirectory('console');
  const browserInfo = await fetchCdpJson('/json/version');

  return withCdpBrowser(async (browser) => {
    const { page } = findRecentPage(browser);
    return captureConsoleFromPage(page, durationMs, artifactsDir, browserInfo);
  });
}

/**
 * @param {import('playwright-core').Page} page
 * @param {number} durationMs
 * @param {string} artifactsDir
 * @param {object} browserInfo
 * @param {{ attach?: boolean }} [sessionInfo]
 */
async function captureConsoleFromPage(
  page,
  durationMs,
  artifactsDir,
  browserInfo,
  sessionInfo = {},
) {
  const consoleListener = attachConsoleListeners(page, { mode: 'full' });

  try {
    await sleep(durationMs);

    const pageDetails = await getPageDetails(page);
    const consoleEntries = consoleListener.getEntries();
    const metadata = buildMetadata('console', artifactsDir, browserInfo, {
      url: pageDetails.url || null,
      title: pageDetails.title || null,
      durationMs,
      consoleMessageCount: consoleEntries.length,
      ...sessionInfo,
    });

    writeJson(artifactsDir, 'metadata.json', metadata);
    writeJson(artifactsDir, 'console.json', { entries: consoleEntries });

    if (isSanitizeEnabled()) sanitizeArtifacts(artifactsDir);
    log(`Saved console artifacts to ${artifactsDir}`);

    return {
      artifactsDir,
      metadata,
      consoleMessageCount: consoleEntries.length,
    };
  } finally {
    consoleListener.detach();
  }
}
