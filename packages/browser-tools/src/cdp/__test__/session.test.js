import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockBringToFront = vi.fn();
const mockDetach = vi.fn();
const mockClose = vi.fn(() => Promise.resolve());

vi.mock('../connect.js', () => ({
  connectOverCDP: vi.fn(),
}));

vi.mock('../console.js', () => ({
  attachConsoleListeners: vi.fn(() => ({
    pageErrors: [],
    detach: mockDetach,
  })),
}));

import { connectOverCDP } from '../connect.js';
import { withAttachedSession } from '../session.js';

describe('withAttachedSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('brings the matched page to front and detaches the console listener', async () => {
    const page = {
      bringToFront: mockBringToFront,
      url: () => 'http://localhost:5173/',
    };
    const browser = {
      contexts: () => [{ pages: () => [page] }],
      close: mockClose,
    };
    connectOverCDP.mockResolvedValue(browser);

    const result = await withAttachedSession(
      'http://localhost:5173/',
      async ({ page: matchedPage }) => {
        expect(matchedPage).toBe(page);
        return 'ok';
      },
    );

    expect(result).toBe('ok');
    expect(mockBringToFront).toHaveBeenCalledOnce();
    expect(mockDetach).toHaveBeenCalledOnce();
    expect(mockClose).toHaveBeenCalledOnce();
  });

  it('throws with an open hint when no tab matches the origin', async () => {
    const browser = {
      contexts: () => [{ pages: () => [] }],
      close: mockClose,
    };
    connectOverCDP.mockResolvedValue(browser);

    await expect(
      withAttachedSession('http://localhost:5173/', async () => {}),
    ).rejects.toThrow(/No open tab found/);

    expect(mockClose).toHaveBeenCalledOnce();
    expect(mockBringToFront).not.toHaveBeenCalled();
  });
});
