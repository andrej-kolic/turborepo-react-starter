import { execSync } from 'node:child_process';
import path from 'node:path';
import { fetchCdpJson } from '@repo/browser-tools/cdp';
import { z } from 'zod';
import { HOST, PORT } from '../config/env.js';

/**
 * @param {string} command
 * @returns {string | null}
 */
function safeExec(command) {
  try {
    return execSync(command, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Current git branch, from `CAPTURE_BRANCH` or git.
 *
 * @returns {string | null}
 */
export function getGitBranch() {
  return (
    process.env.CAPTURE_BRANCH ||
    safeExec('git branch --show-current') ||
    safeExec('git rev-parse --abbrev-ref HEAD') ||
    null
  );
}

/**
 * Current git commit SHA.
 *
 * @returns {string | null}
 */
export function getGitCommit() {
  return safeExec('git rev-parse HEAD');
}

const browserVersionSchema = z.looseObject({
  Browser: z.string().optional(),
  'Protocol-Version': z.string().optional(),
  'User-Agent': z.string().optional(),
});

/** @typedef {z.infer<typeof browserVersionSchema>} BrowserVersionInfo */

/**
 * Fetch Chrome's version info from the DevTools HTTP API.
 *
 * @returns {Promise<BrowserVersionInfo>}
 */
export async function fetchBrowserInfo() {
  return browserVersionSchema.parse(await fetchCdpJson('/json/version'));
}

/**
 * Build capture metadata with git, Chrome, and CI context.
 *
 * @param {string} mode
 * @param {string} artifactsDir
 * @param {BrowserVersionInfo} browserInfo
 * @param {import('../types.js').CaptureDetails} details
 * @returns {import('../types.js').CaptureMetadata}
 */
export function buildMetadata(mode, artifactsDir, browserInfo, details) {
  return {
    mode,
    capturedAt: new Date().toISOString(),
    artifactDirectory: path.relative(process.cwd(), artifactsDir),
    branch: getGitBranch(),
    commit: getGitCommit(),
    actor: process.env.GITHUB_ACTOR || process.env.USER || null,
    triggerEvent: process.env.GITHUB_EVENT_NAME || 'local',
    chrome: {
      browser: browserInfo.Browser || null,
      protocolVersion: browserInfo['Protocol-Version'] || null,
      userAgent: browserInfo['User-Agent'] || null,
    },
    devtoolsEndpoint: `http://${HOST}:${PORT}`,
    ...details,
  };
}
