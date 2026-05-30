#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import http from 'node:http';
import { execSync } from 'node:child_process';

const PORT = process.env.CHROME_DEBUG_PORT || 9222;
const HOST = 'localhost';

function httpGet(pathname) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: HOST, port: PORT, path: pathname, method: 'GET' };
    const req = http.request(opts, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function captureSnapshot() {
  try {
    const version = await httpGet('/json/version');
    const list = await httpGet('/json/list');

    const artifactsDir = path.join(
      process.cwd(),
      'packages',
      'automation',
      'artifacts',
    );
    fs.mkdirSync(artifactsDir, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(
      path.join(artifactsDir, `version-${ts}.json`),
      version.data,
    );
    fs.writeFileSync(path.join(artifactsDir, `pages-${ts}.json`), list.data);

    console.log(`Saved artifacts to ${artifactsDir}`);
  } catch (e) {
    console.error(
      'Failed to capture snapshot:',
      e && e.message ? e.message : e,
    );
    process.exit(1);
  }
}

function usage() {
  console.log('copilot-devtools CLI');
  console.log('Usage: copilot-devtools <command>');
  console.log('Commands: capture-snapshot, record-trace, upload-artifacts');
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd || cmd === 'help' || cmd === '--help') {
    usage();
    process.exit(0);
  }

  if (cmd === 'capture-snapshot') {
    await captureSnapshot();
    process.exit(0);
  } else if (cmd === 'record-trace') {
    console.error(
      'record-trace: not implemented in MVP. Use chrome-devtools-mcp or Puppeteer for tracing.',
    );
    process.exit(2);
  } else if (cmd === 'upload-artifacts') {
    const artifactsDir = path.join(
      process.cwd(),
      'packages',
      'automation',
      'artifacts',
    );
    if (!fs.existsSync(artifactsDir)) {
      console.error('No artifacts found.');
      process.exit(1);
    }
    const tar = path.join(
      process.cwd(),
      'packages',
      'automation',
      `artifacts-${Date.now()}.tar.gz`,
    );
    try {
      execSync(`tar -czf "${tar}" -C "${artifactsDir}" .`);
      console.log(`Packaged artifacts to ${tar}`);
      process.exit(0);
    } catch (e) {
      console.error(
        'Failed to package artifacts:',
        e && e.message ? e.message : e,
      );
      process.exit(1);
    }
  } else {
    console.error(`Unknown command: ${cmd}`);
    usage();
    process.exit(1);
  }
}

main();
