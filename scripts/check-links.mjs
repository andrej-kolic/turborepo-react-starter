#!/usr/bin/env node
/**
 * Validates that relative file paths referenced in markdown files exist on disk.
 * Covers .md and .mdc files; skips http/https URLs and anchor-only links.
 *
 * Usage:
 *   node scripts/check-links.mjs              # check all markdown files
 *   node scripts/check-links.mjs file.md ...  # check specific files (lint-staged mode)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const IGNORE_DIRS = ['node_modules', '.turbo', 'dist', '.git'];

function findMarkdownFiles() {
  const results = [];
  function walk(dir) {
    const entries = globSync('*', { cwd: dir, withFileTypes: true });
    for (const entry of entries) {
      const name = entry.name ?? entry;
      if (IGNORE_DIRS.includes(name)) continue;
      const full = resolve(dir, name);
      if (entry.isDirectory?.() ?? false) {
        walk(full);
      } else {
        const ext = extname(name);
        if (ext === '.md' || ext === '.mdc') results.push(full);
      }
    }
  }
  walk(root);
  return results;
}

// Matches markdown links [label](target) and bare <target> refs.
// Captures the path portion, excluding query strings and anchors.
const LINK_RE = /\[(?:[^\]]*)\]\(([^)#?]+)(?:[#?][^)]*)?\)/g;

function extractLinks(content) {
  const links = [];
  let m;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(content)) !== null) {
    const target = m[1].trim();
    // skip external URLs and empty targets
    if (!target || target.startsWith('http') || target.startsWith('//'))
      continue;
    links.push(target);
  }
  return links;
}

const files =
  process.argv.length > 2
    ? process.argv.slice(2).map((f) => resolve(f))
    : findMarkdownFiles();

let errors = 0;

for (const file of files) {
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue; // file removed between lint-staged list and read — skip
  }

  const links = extractLinks(content);
  const base = dirname(file);

  for (const link of links) {
    const target = resolve(base, link);
    if (!existsSync(target)) {
      const rel = file.replace(root + '/', '');
      console.error(`  ✗ ${rel}\n      broken: ${link}`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} broken internal link(s) found.`);
  console.error(
    'Update the paths or run the rename in all referencing files.\n',
  );
  process.exit(1);
}

console.log(
  `✅ All internal markdown links are valid (${files.length} file(s) checked).`,
);
