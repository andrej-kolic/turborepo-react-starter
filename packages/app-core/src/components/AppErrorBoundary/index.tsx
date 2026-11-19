import React from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { ErrorScreen } from '../ErrorScreen';

function AppErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps): React.ReactNode {
  return (
    <ErrorScreen
      error={error}
      onRetry={resetErrorBoundary}
      data-testid="app-error"
    />
  );
}

type AppErrorBoundaryProps = Readonly<{
  children: React.ReactNode;
}>;

/**
 * Catches render errors anywhere below it and shows a fallback with a "Try again" button,
 * instead of unmounting the whole app. "Try again" mounts the children again, with fresh state.
 * Errors inside a route are caught first by the router's `RouteError` screen.
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
