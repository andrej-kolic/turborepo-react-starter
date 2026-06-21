(() => {
  'use strict';

  function getElementInfo(el) {
    if (!el || !el.tagName) return null;
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
      inputType: el.type || null,
      name: el.getAttribute('name') || null,
    };
  }

  function getReactInfo(el) {
    try {
      if (!el || typeof el !== 'object') return null;
      const fiberKey = Object.keys(el).find((k) =>
        k.startsWith('__reactFiber$'),
      );
      if (!fiberKey) return null;
      let fiber = el[fiberKey];
      while (fiber && fiber.tag !== 0 && fiber.tag !== 1) fiber = fiber.return;
      if (!fiber) return null;
      const result = {
        componentName:
          (fiber.type && (fiber.type.name || fiber.type.displayName)) || null,
      };
      if (fiber._debugSource) {
        result.fileName = fiber._debugSource.fileName;
        result.lineNumber = fiber._debugSource.lineNumber;
        result.columnNumber = fiber._debugSource.columnNumber;
      } else if (fiber._debugStack) {
        const stack =
          typeof fiber._debugStack === 'string'
            ? fiber._debugStack
            : fiber._debugStack && fiber._debugStack.stack;
        const match = stack && stack.match(/\(([^)]+):(\d+):(\d+)\)/);
        if (match) {
          result.scriptUrl = match[1];
          result.lineNumber = parseInt(match[2], 10);
          result.columnNumber = parseInt(match[3], 10);
        }
      }
      return result;
    } catch (_e) {
      return null;
    }
  }

  let lastClickTime = 0;

  function send(event) {
    try {
      if (typeof window.__recordInteraction === 'function') {
        window.__recordInteraction(event);
      }
    } catch (_e) {}
  }

  document.addEventListener(
    'click',
    (e) => {
      const el = e.target;
      if (!el || !el.tagName) return;
      const tag = el.tagName.toLowerCase();
      const t = el.type;
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
      if (!el || !el.tagName) return;
      const tag = el.tagName.toLowerCase();
      const elInfo = getElementInfo(el);
      const react = getReactInfo(el);
      if (tag === 'select') {
        send({ type: 'selectOption', element: elInfo, value: el.value, react });
      } else if (
        tag === 'input' &&
        (el.type === 'checkbox' || el.type === 'radio')
      ) {
        send({
          type: el.checked ? 'check' : 'uncheck',
          element: elInfo,
          react,
        });
      } else if (
        (tag === 'input' && el.type !== 'file') ||
        tag === 'textarea'
      ) {
        send({ type: 'fill', element: elInfo, value: el.value, react });
      }
    },
    true,
  );

  function onNavigation(url) {
    if (Date.now() - lastClickTime < 1000) return;
    send({ type: 'navigate', url: url || location.href });
  }

  const origPushState = history.pushState;
  history.pushState = function (state, title, url) {
    const result = origPushState.call(history, state, title, url);
    onNavigation(typeof url === 'string' ? url : location.href);
    return result;
  };

  window.addEventListener('popstate', () => {
    onNavigation(location.href);
  });
})();
