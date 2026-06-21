import { buildMetadata } from '../artifact-io/metadata.js';
import { ensureArtifactsDirectory } from '../artifact-io/paths.js';
import { writeJson } from '../artifact-io/write.js';
import { log } from '../config/log.js';
import { isSanitizeEnabled } from '../config/runtime.js';
import { fetchCdpJson } from '@repo/browser-tools/cdp';
import { sanitizeArtifacts } from '../sanitize/index.js';

export async function captureSnapshot() {
  const artifactsDir = ensureArtifactsDirectory('snapshot');
  const browserInfo = await fetchCdpJson('/json/version');
  const pages = await fetchCdpJson('/json/list');
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
