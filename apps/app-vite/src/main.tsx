import React from "react";
import ReactDOM from "react-dom/client";
// import App from '~/App.tsx'
import { AppCore } from "@repo/app-core";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* <App /> */}
    <AppCore title="app-vite" href="#">
      <div>trt</div>
    </AppCore>
  </React.StrictMode>
);
