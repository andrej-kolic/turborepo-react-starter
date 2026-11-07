import { execSync } from 'node:child_process';
import path from 'node:path';
import { HOST, PORT } from '../config/env.js';

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

export function getGitBranch() {
  return (
    process.env.CAPTURE_BRANCH ||
    safeExec('git branch --show-current') ||
    safeExec('git rev-parse --abbrev-ref HEAD') ||
    null
  );
}

export function getGitCommit() {
  return safeExec('git rev-parse HEAD');
}

/**
 * Build capture metadata with git, Chrome, and CI context.
 *
 * @param {string} mode
 * @param {string} artifactsDir
 * @param {object} browserInfo
 * @param {object} [extra]
 * @returns {object}
 */
export function buildMetadata(mode, artifactsDir, browserInfo, extra = {}) {
  return {
    mode,
    capturedAt: new Date().toISOString(),
    artifactDirectory: path.relative(process.cwd(), artifactsDir),
    branch: getGitBranch(),
    commit: getGitCommit(),
    actor: process.env.GITHUB_ACTOR || process.env.USER || null,
    triggerEvent: process.env.GITHUB_EVENT_NAME || 'local',
    chrome: {
      browser: browserInfo.Browser || browserInfo.browser || null,
      protocolVersion:
        browserInfo['Protocol-Version'] || browserInfo.protocolVersion || null,
      userAgent: browserInfo['User-Agent'] || browserInfo.userAgent || null,
    },
    devtoolsEndpoint: `http://${HOST}:${PORT}`,
    ...extra,
  };
}
