import React from 'react';
import { getErrorMessage } from 'react-error-boundary';
import { getEnvironmentVariables } from '../../utils/environment';
import './styles.css';

// production users get plain text instead of developer messages; not a security measure,
// since the browser console still logs the full error
const showErrorMessage =
  getEnvironmentVariables().BUILD_ENVIRONMENT !== 'production';

// one stable function, so React calls it on mount only, not on every re-render
const focusOnMount = (node: HTMLElement | null) => node?.focus();

type ErrorScreenProps = Readonly<{
  error: unknown;
  onRetry: () => void;
  'data-testid': string;
}>;

/**
 * The "Something went wrong" screen with a "Try again" button, shared by `AppErrorBoundary`
 * and the router's route error screen (`RouteError`). The error message shows in every build
 * except `BUILD_ENVIRONMENT=production`.
 */
export function ErrorScreen({
  error,
  onRetry,
  'data-testid': testId,
}: ErrorScreenProps): React.ReactNode {
  return (
    <div className="ErrorScreen" role="alert" data-testid={testId}>
      {/* the button that threw is gone, so move keyboard focus here */}
      <h1 className="ErrorScreen__title" tabIndex={-1} ref={focusOnMount}>
        Something went wrong
      </h1>
      {showErrorMessage && (
        <pre className="ErrorScreen__message">
          {getErrorMessage(error) ?? String(error)}
        </pre>
      )}
      <button type="button" className="Button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
