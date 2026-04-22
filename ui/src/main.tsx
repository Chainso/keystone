import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import "./app/styles.css";
import {
  applyResolvedThemeToDocument,
  readStoredThemePreference,
  readSystemTheme,
  resolveThemePreference
} from "./app/theme";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Missing #root element for the Keystone UI bootstrap.");
}

applyResolvedThemeToDocument(
  resolveThemePreference(readStoredThemePreference(), readSystemTheme())
);

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
