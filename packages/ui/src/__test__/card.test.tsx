import React from 'react';
import { screen, render } from '@testing-library/react';
import { Card } from '../Card';

describe('Card', () => {
  it('should render', () => {
    render(
      <Card href="example.com" title="Cool title">
        Cool content
      </Card>,
    );

    expect(screen.getByText(/Cool title/i)).toBeInTheDocument();
    expect(screen.getByText(/Cool content/i)).toBeInTheDocument();
  });

  it('showsDefaultIcon_whenImageOmitted', () => {
    render(<Card title="Cool title" />);

    expect(screen.getByRole('img', { name: 'icon' })).toBeInTheDocument();
  });

  it('showsNoImage_whenImageIsNull', () => {
    render(<Card title="Cool title" image={null} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
