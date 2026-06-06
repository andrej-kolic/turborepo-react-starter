#!/usr/bin/env node
/**
 * Ensures MCP server definitions stay in sync between Cursor and VS Code configs.
 * .cursor/mcp.json uses "mcpServers"; .vscode/mcp.json uses "servers" — same payloads.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const paths = {
  cursor: join(root, '.cursor/mcp.json'),
  vscode: join(root, '.vscode/mcp.json'),
};

function loadServers(filePath, key) {
  let config;
  try {
    config = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Failed to read ${filePath}: ${error.message}`);
    process.exit(1);
  }

  const servers = config[key];
  if (!servers || typeof servers !== 'object') {
    console.error(`Missing or invalid "${key}" in ${filePath}`);
    process.exit(1);
  }

  return servers;
}

const cursorServers = loadServers(paths.cursor, 'mcpServers');
const vscodeServers = loadServers(paths.vscode, 'servers');

const cursorJson = JSON.stringify(cursorServers, null, 2);
const vscodeJson = JSON.stringify(vscodeServers, null, 2);

if (cursorJson !== vscodeJson) {
  console.error('MCP server configs are out of sync:\n');
  console.error('  .cursor/mcp.json  → mcpServers');
  console.error('  .vscode/mcp.json  → servers\n');
  console.error(
    'Update both files with identical server definitions (only the root key differs).',
  );
  process.exit(1);
}

console.log('MCP configs in sync (.cursor/mcp.json ↔ .vscode/mcp.json)');
