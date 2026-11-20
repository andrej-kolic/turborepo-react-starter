import React from 'react';
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { ErrorScreen } from '../ErrorScreen';

/**
 * The router's default error screen: shown in place of a page that threw, while the
 * layout around it (header, navigation) stays. "Try again" reloads the route.
 */
export function RouteError({ error }: ErrorComponentProps): React.ReactNode {
  const router = useRouter();

  return (
    <ErrorScreen
      error={error}
      // invalidate also resets the route's error boundary
      onRetry={() => void router.invalidate()}
      data-testid="route-error"
    />
  );
}
