import { createRoot } from 'react-dom/client';
import { AppCore } from '@repo/app-core';
import './index.css';

const rootNode = document.getElementById('app');

if (!rootNode) {
  throw new Error('no root element');
}

// demo: a component export, so foo below triggers react/only-export-components
export const Wrapper = () => (
  <AppCore href="#" title="app-rspack">
    Content!
  </AppCore>
);

createRoot(rootNode).render(<Wrapper />);

// demo: triggers the react/only-export-components lint warning
export const foo = () => {
  //
};
