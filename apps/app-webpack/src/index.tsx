import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AppCore } from '@repo/app-core';
import './index.css';

const rootNode = document.getElementById('app');

if (!rootNode) {
  throw new Error('no root element');
}

createRoot(rootNode).render(
  <AppCore href="#" title="app-webpack">
    Content!
  </AppCore>,
);

// TODO: remove - example of lint warning for eslint-plugin-react-refresh
export const foo = () => {
  //
};
