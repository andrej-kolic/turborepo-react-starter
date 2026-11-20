import React, { useState } from 'react';

/**
 * Demo: a "Throw app error" button that `WebApp` renders outside the router, so its error
 * skips the router's `RouteError` screen and reaches `AppErrorBoundary`. It throws during
 * render, not in the click handler, because error boundaries only catch render errors.
 */
export function AppErrorDemo(): React.ReactNode {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Demo error from outside the router');
  }

  return (
    <button
      type="button"
      className="Button"
      onClick={() => setShouldThrow(true)}
    >
      Throw app error
    </button>
  );
}
