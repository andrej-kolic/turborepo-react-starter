(() => {
  'use strict';

  /**
   * A React fiber node; only the fields read here.
   *
   * @typedef {{
   *   tag: number,
   *   type?: { name?: string, displayName?: string } | string | null,
   *   return: Fiber | null,
   *   _debugSource?: { fileName: string, lineNumber: number, columnNumber: number },
   *   _debugStack?: string | { stack?: string },
   * }} Fiber
   */

  const recorderWindow =
    /** @type {Window & {
     *   __BROWSER_CAPTURE_INTERACTIONS__?: boolean,
     *   __recordInteraction?: (event: import('../types.js').Interaction) => void,
     * }} */ (window);
  if (recorderWindow.__BROWSER_CAPTURE_INTERACTIONS__) return;
  recorderWindow.__BROWSER_CAPTURE_INTERACTIONS__ = true;

  /**
   * @param {Element} el
   * @returns {import('../types.js').RecordedElement}
   */
  function getElementInfo(el) {
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      testId:
        el.getAttribute('data-testid') ||
        el.getAttribute('data-test-id') ||
        null,
      ariaLabel: el.getAttribute('aria-label') || null,
      role: el.getAttribute('role') || null,
      text: (el.textContent || '').trim().slice(0, 120) || null,
      inputType:
        ('type' in el && typeof el.type === 'string' && el.type) || null,
      name: el.getAttribute('name') || null,
    };
  }

  /**
   * Find where the element's JSX was written in a React 19 `_debugStack`.
   * The stack runs from React's JSX runtime (`jsxDEV`) down to
   * `react_stack_bottom_frame`, so the call site is the first frame after the
   * runtime. React swaps in a placeholder stack after its 10,000-element
   * budget; that one has no frame in between, and gives null.
   *
   * @param {string} stack
   * @returns {RegExpMatchArray | null} groups 1-3: script URL, line, column
   */
  function jsxCallSite(stack) {
    const lines = stack.split('\n');
    const bottom = lines.findIndex((line) =>
      /react[_-]stack[_-]bottom[_-]frame/.test(line),
    );
    if (bottom === -1) return null;
    const frames = lines
      .slice(0, bottom)
      .map((line) => line.match(/^\s*at (?:.*\()?(.+?):(\d+):(\d+)\)?$/))
      .filter((match) => match !== null);
    return frames[1] ?? null;
  }

  /**
   * @param {Element} el
   * @returns {import('../types.js').ReactInfo | null}
   */
  function getReactInfo(el) {
    try {
      const fiberKey = Object.keys(el).find((k) =>
        k.startsWith('__reactFiber$'),
      );
      if (!fiberKey) return null;
      /** @type {unknown} */
      const host = el;
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- React's fiber is an untyped expando on the DOM node.
      const fibers = /** @type {Record<string, Fiber | undefined>} */ (host);
      const hostFiber = fibers[fiberKey];
      if (!hostFiber) return null;
      /** @type {Fiber | null} */
      let fiber = hostFiber;
      while (fiber && fiber.tag !== 0 && fiber.tag !== 1) fiber = fiber.return;
      if (!fiber) return null;
      const type = typeof fiber.type === 'string' ? null : fiber.type;
      /** @type {import('../types.js').ReactInfo} */
      const result = {
        componentName: (type && (type.name || type.displayName)) || null,
      };
      // The clicked tag's own fiber, not the component's: the component's
      // location is where its parent renders it, in another file.
      if (hostFiber._debugSource) {
        result.fileName = hostFiber._debugSource.fileName;
        result.lineNumber = hostFiber._debugSource.lineNumber;
        result.columnNumber = hostFiber._debugSource.columnNumber;
      } else if (hostFiber._debugStack) {
        const stack =
          typeof hostFiber._debugStack === 'string'
            ? hostFiber._debugStack
            : hostFiber._debugStack.stack;
        const match = stack && jsxCallSite(stack);
        if (match?.[1] && match[2] && match[3]) {
          result.scriptUrl = match[1];
          result.lineNumber = parseInt(match[2], 10);
          result.columnNumber = parseInt(match[3], 10);
        }
      }
      return result;
    } catch {
      return null;
    }
  }

  let lastClickTime = 0;

  /** @param {import('../types.js').Interaction} event */
  function send(event) {
    try {
      recorderWindow.__recordInteraction?.(event);
    } catch {
      // The page may have closed the binding; drop the event.
    }
  }

  document.addEventListener(
    'click',
    (e) => {
      const el = e.target;
      if (!(el instanceof Element)) return;
      const tag = el.tagName.toLowerCase();
      const t = el instanceof HTMLInputElement ? el.type : null;
      const isTextLike =
        tag === 'input' &&
        t !== 'checkbox' &&
        t !== 'radio' &&
        t !== 'submit' &&
        t !== 'button' &&
        t !== 'reset';
      if (isTextLike || tag === 'textarea') return;
      lastClickTime = Date.now();
      send({
        type: 'click',
        element: getElementInfo(el),
        react: getReactInfo(el),
      });
    },
    true,
  );

  document.addEventListener(
    'change',
    (e) => {
      const el = e.target;
      if (!(el instanceof Element)) return;
      const elInfo = getElementInfo(el);
      const react = getReactInfo(el);
      if (el instanceof HTMLSelectElement) {
        send({ type: 'selectOption', element: elInfo, value: el.value, react });
      } else if (
        el instanceof HTMLInputElement &&
        (el.type === 'checkbox' || el.type === 'radio')
      ) {
        send({
          type: el.checked ? 'check' : 'uncheck',
          element: elInfo,
          react,
        });
      } else if (
        (el instanceof HTMLInputElement && el.type !== 'file') ||
        el instanceof HTMLTextAreaElement
      ) {
        send({ type: 'fill', element: elInfo, value: el.value, react });
      }
    },
    true,
  );

  /** @param {string} url */
  function onNavigation(url) {
    if (Date.now() - lastClickTime < 1000) return;
    send({ type: 'navigate', url: url || location.href });
  }

  const origPushState = history.pushState.bind(history);
  history.pushState = function (state, title, url) {
    const result = origPushState(state, title, url);
    onNavigation(typeof url === 'string' ? url : location.href);
    return result;
  };

  window.addEventListener('popstate', () => {
    onNavigation(location.href);
  });
})();
