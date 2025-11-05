import React from 'react';
import { screen, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card } from '../card';

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
});
