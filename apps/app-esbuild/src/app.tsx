import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppCore } from '@repo/app-core';
import './app.css';
// import './index.html';

console.log('* in app'); // TODO: remove

const root = document.getElementById('root');

if (!root) {
  throw new Error('no root element');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppCore title="app-vite" href="#">
      <div>trt</div>
    </AppCore>
  </React.StrictMode>,
);
