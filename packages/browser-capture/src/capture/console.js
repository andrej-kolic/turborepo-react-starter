import { buildMetadata } from '../artifact-io/metadata.js';
import { ensureArtifactsDirectory, sleep } from '../artifact-io/paths.js';
import { writeJson } from '../artifact-io/write.js';
import { resolveDurationMs } from '../cli/args.js';
import {
  attachConsoleListeners,
  connectOverCDP,
  fetchCdpJson,
  findRecentPage,
} from '@repo/browser-tools/cdp';
import { log } from '../config/log.js';
import { isSanitizeEnabled } from '../config/runtime.js';
import { sanitizeArtifacts } from '../sanitize/index.js';

export async function recordConsole(options = {}) {
  const durationMs = resolveDurationMs(options);
  const artifactsDir = ensureArtifactsDirectory('console');
  const browserInfo = await fetchCdpJson('/json/version');

  const browser = await connectOverCDP();
  let captureResult = null;

  try {
    const { page } = findRecentPage(browser);
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
    });

    writeJson(artifactsDir, 'metadata.json', metadata);
    writeJson(artifactsDir, 'console.json', { entries: consoleEntries });

    if (isSanitizeEnabled()) sanitizeArtifacts(artifactsDir);
    log(`Saved console artifacts to ${artifactsDir}`);
    captureResult = {
      artifactsDir,
      metadata,
      consoleMessageCount: consoleEntries.length,
    };
  } finally {
    await browser.close().catch(() => {});
  }

  return captureResult;
}
