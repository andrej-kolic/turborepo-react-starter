import React from 'react';
import ReactDOM from 'react-dom/client';
import { WebApp } from '@repo/web';
import { rootOptions } from '@repo/web/optional-features';
import './index.css';
// import './index.html';

console.log('* in app'); // demo: triggers the no-console lint warning

// esbuild has no HMR; its dev server signals each rebuild on /esbuild. The production build drops this.
// Where and how, per https://esbuild.github.io/api/#live-reload
if (!import.meta.env.PROD) {
  new EventSource('/esbuild').addEventListener('change', () => {
    location.reload();
  });
}

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
