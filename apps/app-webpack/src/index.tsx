import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AppCore } from '@repo/app-core';
import './index.css';

const rootNode = document.getElementById('app');
if (rootNode) {
  createRoot(rootNode).render(
    <AppCore href="#" title="app-webpack">
      Content!
    </AppCore>,
  );
}
