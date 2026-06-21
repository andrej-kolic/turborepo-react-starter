import { chromium } from 'playwright-core';
import { HOST, PORT } from '../config/env.js';

export function connectCDP() {
  return chromium.connectOverCDP(`http://${HOST}:${PORT}`);
}

export function getExistingPage(browser) {
  for (const context of browser.contexts()) {
    const pages = [...context.pages()].reverse();
    if (pages.length === 0) {
      continue;
    }

    const page =
      pages.find((p) => {
        const url = p.url();
        return url !== 'about:blank' && !url.startsWith('devtools://');
      }) ?? pages[0];

    return { context, page };
  }

  throw new Error('No existing Chrome page target found.');
}

export function createConsoleListener(page) {
  const entries = [];

  page.on('console', (msg) => {
    entries.push({
      channel: 'runtime',
      type: msg.type(),
      timestamp: Date.now(),
      text: msg.text(),
      location: msg.location(),
    });
  });

  page.on('pageerror', (error) => {
    entries.push({
      channel: 'exception',
      timestamp: Date.now(),
      text: error.message,
      stack: error.stack ?? null,
    });
  });

  return { getEntries: () => entries };
}
