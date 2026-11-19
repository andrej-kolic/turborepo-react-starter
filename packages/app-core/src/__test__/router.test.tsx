import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { createAppRouter } from '../router';

function renderAt(path: string) {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );
  render(<RouterProvider router={router} context={{ title: 'Test app' }} />);
  return router;
}

describe('router', () => {
  it('rendersPageInLayoutWithContextTitle_whenOpenedAtItsPath', async () => {
    renderAt('/about');

    expect(
      await screen.findByRole('heading', { name: 'About' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('Test app');
    expect(
      screen.getByRole('navigation', { name: 'Main' }),
    ).toBeInTheDocument();
  });

  it('showsLinkedPage_whenNavLinkClicked', async () => {
    const router = renderAt('/about');
    await screen.findByRole('heading', { name: 'About' });

    fireEvent.click(screen.getByRole('link', { name: 'Asset imports' }));

    expect(
      await screen.findByRole('region', { name: 'Resources' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/demo/asset-imports');
    expect(
      screen.queryByRole('heading', { name: 'About' }),
    ).not.toBeInTheDocument();
  });

  it('showsNotFoundInLayout_whenNoRouteMatches', async () => {
    renderAt('/no-such-page');

    expect(
      await screen.findByRole('region', { name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
