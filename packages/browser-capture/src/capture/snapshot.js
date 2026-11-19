import { buildMetadata, fetchBrowserInfo } from '../artifact-io/metadata.js';
import { ensureArtifactsDirectory } from '../artifact-io/paths.js';
import { writeJson } from '../artifact-io/write.js';
import { log } from '../config/log.js';
import { isSanitizeEnabled } from '../config/runtime.js';
import { fetchCdpJson } from '@repo/browser-tools/cdp';
import { z } from 'zod';
import { sanitizeArtifacts } from '../sanitize/index.js';

/**
 * Fetch Chrome version info and the list of open CDP pages.
 *
 * @returns {Promise<import('../types.js').CaptureResult>}
 */
export async function captureSnapshot() {
  const artifactsDir = ensureArtifactsDirectory('snapshot');
  const browserInfo = await fetchBrowserInfo();
  const pages = z.array(z.unknown()).parse(await fetchCdpJson('/json/list'));
  const metadata = buildMetadata('snapshot', artifactsDir, browserInfo, {
    pageCount: pages.length,
    url: null,
  });

  writeJson(artifactsDir, 'metadata.json', metadata);
  writeJson(artifactsDir, 'version.json', browserInfo);
  writeJson(artifactsDir, 'pages.json', pages);

  if (isSanitizeEnabled()) sanitizeArtifacts(artifactsDir);
  log(`Saved snapshot artifacts to ${artifactsDir}`);
  return { artifactsDir, metadata };
}
