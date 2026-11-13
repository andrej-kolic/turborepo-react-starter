import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { interactionRecorderInject } from '../src/inject/paths.js';

class FakeElement {
  tagName = 'HEADER';
  id = '';
  textContent = '';
  /** @returns {string | null} */
  getAttribute() {
    return null;
  }
}

/** Stands in for the input, select and textarea classes the click is not. */
class OtherElement extends FakeElement {}

/**
 * Run the recorder script in a fake page and click an element.
 *
 * @param {object} fiber the React fiber attached to the clicked element
 * @returns {import('../src/types.js').Interaction[]} what the recorder sent
 */
function recordClick(fiber) {
  /** @type {import('../src/types.js').Interaction[]} */
  const sent = [];
  /** @type {Record<string, (event: { target: unknown }) => void>} */
  const listeners = {};
  const context = createContext({
    window: {
      addEventListener() {},
      __recordInteraction: (
        /** @type {import('../src/types.js').Interaction} */ event,
      ) => sent.push(event),
    },
    document: {
      addEventListener: (
        /** @type {string} */ type,
        /** @type {(event: { target: unknown }) => void} */ listener,
      ) => {
        listeners[type] = listener;
      },
    },
    history: { pushState() {} },
    location: { href: 'http://localhost:5173/' },
    Element: FakeElement,
    HTMLInputElement: OtherElement,
    HTMLSelectElement: OtherElement,
    HTMLTextAreaElement: OtherElement,
  });
  runInContext(readFileSync(interactionRecorderInject, 'utf8'), context);

  const el = Object.assign(new FakeElement(), { __reactFiber$abc: fiber });
  listeners.click?.({ target: el });
  return sent;
}

/**
 * A React 19 `_debugStack` whose JSX was written in `caller` at `file`.
 *
 * @param {string} caller
 * @param {string} file
 * @returns {{ stack: string }}
 */
function debugStack(caller, file) {
  return {
    stack: [
      'Error: react-stack-top-frame',
      '    at exports.jsxDEV (http://localhost:5173/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=0a0ec98b:196:25)',
      `    at ${caller} (http://localhost:5173/@fs/repo/packages/app-core/src/${file})`,
      '    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=a6374596:14139:12)',
    ].join('\n'),
  };
}

describe('interaction recorder', () => {
  it('records where the clicked tag is written, not the React runtime or the parent', () => {
    const header = {
      tag: 0,
      type: { name: 'Header' },
      return: null,
      _debugStack: debugStack('AppCore', 'index.tsx:23:20'),
    };

    const [click] = recordClick({
      tag: 5,
      type: 'header',
      return: header,
      _debugStack: debugStack('Header', 'components/Header/index.tsx:12:25'),
    });

    expect(click?.react).toEqual({
      componentName: 'Header',
      scriptUrl:
        'http://localhost:5173/@fs/repo/packages/app-core/src/components/Header/index.tsx',
      lineNumber: 12,
      columnNumber: 25,
    });
  });

  it('records no location once React swaps in its placeholder stack', () => {
    const [click] = recordClick({
      tag: 0,
      type: { name: 'Header' },
      return: null,
      _debugStack: {
        stack: [
          'Error: react-stack-top-frame',
          '    at UnknownOwner (http://localhost:5173/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=0a0ec98b:121:14)',
          '    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react.js?v=0a0ec98b:900:12)',
          '    at http://localhost:5173/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=0a0ec98b:320:51',
        ].join('\n'),
      },
    });

    expect(click?.react).toEqual({ componentName: 'Header' });
  });
});
