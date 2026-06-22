import { buildMetadata } from '../artifact-io/metadata.js';
import { ensureArtifactsDirectory, sleep } from '../artifact-io/paths.js';
import { writeJson } from '../artifact-io/write.js';
import { captureOptions, requireUrl } from '../cli/args.js';
import {
  attachConsoleListeners,
  connectOverCDP,
  fetchCdpJson,
  findRecentPage,
  withAttachedSession,
} from '@repo/browser-tools/cdp';
import { log } from '../config/log.js';
import { isSanitizeEnabled } from '../config/runtime.js';
import { sanitizeArtifacts } from '../sanitize/index.js';

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
  let captureResult = null;

  await withAttachedSession(url, async ({ page }) => {
    captureResult = await captureConsoleFromPage(
      page,
      durationMs,
      artifactsDir,
      browserInfo,
      { attach: true },
    );
  });

  return captureResult;
}

async function recordConsoleRecent(durationMs) {
  const artifactsDir = ensureArtifactsDirectory('console');
  const browserInfo = await fetchCdpJson('/json/version');

  const browser = await connectOverCDP();
  let captureResult = null;

  try {
    const { page } = findRecentPage(browser);
    captureResult = await captureConsoleFromPage(
      page,
      durationMs,
      artifactsDir,
      browserInfo,
    );
  } finally {
    await browser.close().catch(() => {});
  }

  return captureResult;
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

  await sleep(durationMs);

  const pageDetails = await page
    .evaluate(() => ({ url: location.href, title: document.title }))
    .catch(() => ({ url: null, title: null }));
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
}
