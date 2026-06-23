import { describe, expect, it } from 'vitest';
import { findPageAtOrigin, findRecentPage } from '../pages.js';

function makePage(url) {
  return { url: () => url };
}

function makeBrowser(contexts) {
  return { contexts: () => contexts };
}

describe('findPageAtOrigin', () => {
  it('returns the page whose origin matches the target URL', async () => {
    const matching = makePage('http://localhost:5173/dashboard');
    const other = makePage('http://example.com/');
    const browser = makeBrowser([{ pages: () => [other, matching] }]);

    await expect(
      findPageAtOrigin(browser, 'http://localhost:5173/'),
    ).resolves.toBe(matching);
  });

  it('prefers the most recently used tab when multiple share an origin', async () => {
    const first = makePage('http://localhost:5173/a');
    const second = makePage('http://localhost:5173/b');
    const browser = makeBrowser([{ pages: () => [first, second] }]);

    await expect(
      findPageAtOrigin(browser, 'http://localhost:5173/'),
    ).resolves.toBe(second);
  });

  it('returns null when no page matches the origin', async () => {
    const browser = makeBrowser([
      { pages: () => [makePage('http://example.com/')] },
    ]);

    await expect(
      findPageAtOrigin(browser, 'http://localhost:5173/'),
    ).resolves.toBeNull();
  });

  it('returns null for an invalid URL', async () => {
    const browser = makeBrowser([
      { pages: () => [makePage('http://localhost:5173/')] },
    ]);

    await expect(findPageAtOrigin(browser, 'not-a-url')).resolves.toBeNull();
  });
});

describe('findRecentPage', () => {
  it('returns the most recent non-blank page', () => {
    const blank = makePage('about:blank');
    const devtools = makePage('devtools://devtools/bundled/inspector.html');
    const app = makePage('http://localhost:5173/');
    const context = { pages: () => [blank, devtools, app] };
    const browser = makeBrowser([context]);

    expect(findRecentPage(browser)).toEqual({ context, page: app });
  });

  it('falls back to the latest page when all pages are blank or devtools', () => {
    const blank = makePage('about:blank');
    const devtools = makePage('devtools://devtools/bundled/inspector.html');
    const context = { pages: () => [blank, devtools] };
    const browser = makeBrowser([context]);

    expect(findRecentPage(browser)).toEqual({ context, page: devtools });
  });

  it('throws when no page targets exist', () => {
    const browser = makeBrowser([{ pages: () => [] }]);

    expect(() => findRecentPage(browser)).toThrow(
      'No existing Chrome page target found.',
    );
  });
});
