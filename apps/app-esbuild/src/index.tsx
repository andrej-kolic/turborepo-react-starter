import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppCore } from '@repo/app-core';
import './index.css';
// import './index.html';

console.log('* in app'); // demo: triggers the no-console lint warning

// demo: a component export, so foo below triggers react/only-export-components
export const Wrapper = () => (
  <AppCore title="app-esbuild" href="#">
    <div>trt</div>
  </AppCore>
);

const root = document.getElementById('root');

if (!root) {
  throw new Error('no root element');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Wrapper />
  </React.StrictMode>,
);

// demo: triggers the react/only-export-components lint warning
export const foo = () => {
  //
};
