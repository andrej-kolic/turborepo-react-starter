import React from 'react';
import ReactDOM from 'react-dom/client';
import { WebApp } from '@repo/web';
import { rootOptions } from '@repo/web/optional-features';
import './index.css';
// import './index.html';

console.log('* in app'); // demo: triggers the no-console lint warning

// demo: a component export, so foo below triggers react/only-export-components
export const Wrapper = () => (
  <WebApp title="web-esbuild" href="#">
    <div>trt</div>
  </WebApp>
);

const root = document.getElementById('root');

if (!root) {
  throw new Error('no root element');
}

ReactDOM.createRoot(root, rootOptions).render(
  <React.StrictMode>
    <Wrapper />
  </React.StrictMode>,
);

// demo: triggers the react/only-export-components lint warning
export const foo = () => {
  //
};
