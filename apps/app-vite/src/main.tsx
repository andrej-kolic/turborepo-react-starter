import React from "react";
import ReactDOM from "react-dom/client";
import { AppCore } from "@repo/app-core";
import "./index.css";

// TODO: // remove
export const Wrapper = () => {
  // console.log("@ process.env:", process.env);
  // console.log("@ process.env.API_URL:", process.env.API_URL);

  // console.log("@ import.meta.env:", import.meta.env);
  // console.log("@ import.meta.env.APP_REACT_TITLE:", import.meta.env.APP_REACT_TITLE);

  return (
    <AppCore title="app-vite" href="#">
      <div>trt</div>
    </AppCore>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Wrapper />
  </React.StrictMode>
);
