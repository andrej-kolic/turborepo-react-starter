import React from 'react';
import {
  ErrorBoundary,
  getErrorMessage,
  type FallbackProps,
} from 'react-error-boundary';
import { getEnvironmentVariables } from '../../utils/environment';
import './styles.css';

// production users get plain text instead of developer messages; not a security measure,
// since the browser console still logs the full error
const showErrorMessage =
  getEnvironmentVariables().BUILD_ENVIRONMENT !== 'production';

// one stable function, so React calls it on mount only, not on every re-render
const focusOnMount = (node: HTMLElement | null) => node?.focus();

function AppErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps): React.ReactNode {
  return (
    <div className="AppErrorBoundary" role="alert" data-testid="app-error">
      {/* the button that threw is gone, so move keyboard focus here */}
      <h1 className="AppErrorBoundary__title" tabIndex={-1} ref={focusOnMount}>
        Something went wrong
      </h1>
      {showErrorMessage && (
        <pre className="AppErrorBoundary__message">
          {getErrorMessage(error) ?? String(error)}
        </pre>
      )}
      <button type="button" className="Button" onClick={resetErrorBoundary}>
        Try again
      </button>
    </div>
  );
}

type AppErrorBoundaryProps = Readonly<{
  children: React.ReactNode;
}>;

/**
 * Catches render errors anywhere below it and shows a fallback with a "Try again" button,
 * instead of unmounting the whole app. "Try again" mounts the children again, with fresh state.
 * The error message shows in every build except `BUILD_ENVIRONMENT=production`.
 */
export function AppErrorBoundary({
  children,
}: AppErrorBoundaryProps): React.ReactNode {
  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}
