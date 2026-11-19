import React from 'react';
import { fireEvent, screen, render } from '@testing-library/react';
import { ResourceCards } from '..';
import { AppErrorBoundary } from '../../AppErrorBoundary';

describe('ResourceCards', () => {
  beforeEach(() => {
    // React logs every caught render error; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('showsAppErrorFallback_whenThrowErrorClicked', () => {
    render(
      <AppErrorBoundary>
        <ResourceCards />
      </AppErrorBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Throw error' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Demo error from the "Error boundary" card',
    );
  });

  it('showsCardsAgain_whenTryAgainClickedAfterThrow', () => {
    render(
      <AppErrorBoundary>
        <ResourceCards />
      </AppErrorBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Throw error' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      screen.getByRole('region', { name: 'Resources' }),
    ).toBeInTheDocument();
  });
});
