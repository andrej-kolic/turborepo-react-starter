import * as React from "react";
import { createRoot } from "react-dom/client";

import { AppCore } from "app-core";

const rootNode = document.getElementById("app");
if (rootNode) {
  createRoot(rootNode).render(
    <AppCore title="Title" href="#">
      Content
    </AppCore>
  );
}
