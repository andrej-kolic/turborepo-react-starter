import { describe, expect, it } from 'vitest';
import { formatPageSnapshot, formatTestIdRegions } from '../format.js';

describe('formatTestIdRegions', () => {
  it('formats registered regions', () => {
    const text = formatTestIdRegions([
      {
        testid: 'app-header',
        tag: 'header',
        role: null,
        text: 'Turborepo',
        visible: true,
      },
    ]);

    expect(text).toBe('- app-header <header>: "Turborepo"');
  });

  it('marks hidden regions', () => {
    const text = formatTestIdRegions([
      {
        testid: 'modal',
        tag: 'div',
        role: 'dialog',
        text: '',
        visible: false,
      },
    ]);

    expect(text).toBe('- modal <div> role=dialog hidden');
  });

  it('handles empty list', () => {
    expect(formatTestIdRegions([])).toBe('(none)');
  });
});

describe('formatPageSnapshot', () => {
  it('combines metadata, testids, and aria yaml', () => {
    const text = formatPageSnapshot({
      title: 'App Core',
      url: 'http://localhost:5173/',
      testIds: [
        {
          testid: 'app-header',
          tag: 'header',
          role: null,
          text: 'Header',
          visible: true,
        },
      ],
      ariaYaml: '- banner:\n  - heading "App Core"',
    });

    expect(text).toContain('url: http://localhost:5173/');
    expect(text).toContain('title: App Core');
    expect(text).toContain('- app-header <header>: "Header"');
    expect(text).toContain('### aria snapshot');
    expect(text).toContain('- banner:');
  });
});
