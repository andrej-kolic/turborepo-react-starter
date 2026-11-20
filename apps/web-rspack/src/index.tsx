import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WebApp } from '@repo/web';
import { rootOptions } from '@repo/web/optional-features';
import './index.css';

const rootNode = document.getElementById('root');

if (!rootNode) {
  throw new Error('no root element');
}

// demo: a component export, so foo below triggers react/only-export-components
export const Wrapper = () => (
  <WebApp href="#" title="web-rspack">
    Content!
  </WebApp>
);

createRoot(rootNode, rootOptions).render(
  <StrictMode>
    <Wrapper />
  </StrictMode>,
);

// demo: triggers the react/only-export-components lint warning
export const foo = () => {
  //
};
