import { buildMetadata } from '../artifacts/metadata.js';
import { ensureArtifactsDirectory } from '../artifacts/paths.js';
import { writeJson } from '../artifacts/write.js';
import { log } from '../config/log.js';
import { isSanitizeEnabled } from '../config/runtime.js';
import { httpGetJson } from '../cdp/http.js';
import { sanitizeArtifacts } from '../sanitize/index.js';

export async function captureSnapshot() {
  const artifactsDir = ensureArtifactsDirectory('snapshot');
  const browserInfo = await httpGetJson('/json/version');
  const pages = await httpGetJson('/json/list');
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
