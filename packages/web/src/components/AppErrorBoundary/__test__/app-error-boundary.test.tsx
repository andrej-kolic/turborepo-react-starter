import React from 'react';
import { fireEvent, screen, render } from '@testing-library/react';
import { AppErrorBoundary } from '..';

let shouldThrow = false;

function MaybeThrows(): React.ReactNode {
  if (shouldThrow) {
    throw new Error('render failed');
  }
  return <p>content</p>;
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = false;
    // React logs every caught render error; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('rendersChildren_whenNothingThrows', () => {
    render(
      <AppErrorBoundary>
        <MaybeThrows />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('showsFallbackWithMessage_whenChildThrows', () => {
    shouldThrow = true;

    render(
      <AppErrorBoundary>
        <MaybeThrows />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('render failed');
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('rendersChildrenAgain_whenTryAgainClickedAfterFix', () => {
    shouldThrow = true;
    render(
      <AppErrorBoundary>
        <MaybeThrows />
      </AppErrorBoundary>,
    );

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('hidesErrorMessage_whenBuildEnvironmentIsProduction', async () => {
    vi.stubEnv('BUILD_ENVIRONMENT', 'production');
    vi.resetModules();
    const { AppErrorBoundary: ProductionBoundary } = await import('..');
    shouldThrow = true;

    render(
      <ProductionBoundary>
        <MaybeThrows />
      </ProductionBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('alert')).not.toHaveTextContent('render failed');
  });

  it('focusesHeading_whenFallbackShows', () => {
    shouldThrow = true;

    render(
      <AppErrorBoundary>
        <MaybeThrows />
      </AppErrorBoundary>,
    );

    expect(
      screen.getByRole('heading', { name: 'Something went wrong' }),
    ).toHaveFocus();
  });

  it('keepsFocusOnTryAgain_whenFallbackRendersAgain', () => {
    shouldThrow = true;
    const { rerender } = render(
      <AppErrorBoundary>
        <MaybeThrows />
      </AppErrorBoundary>,
    );
    const tryAgain = screen.getByRole('button', { name: 'Try again' });
    tryAgain.focus();

    // new elements, so the fallback renders again
    rerender(
      <AppErrorBoundary>
        <MaybeThrows />
      </AppErrorBoundary>,
    );

    expect(tryAgain).toHaveFocus();
  });
});
