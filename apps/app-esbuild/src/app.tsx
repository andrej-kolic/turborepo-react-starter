import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppCore } from '@repo/app-core';
import './app.css';
// import './index.html';

console.log('* in app'); // TODO: remove

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppCore title="app-vite" href="#">
      <div>trt</div>
    </AppCore>
  </React.StrictMode>,
);
