import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const uiRoot = fileURLToPath(new URL("./ui", import.meta.url));

export default defineConfig({
  root: uiRoot,
  plugins: [react()],
  build: {
    outDir: resolve(uiRoot, "../dist"),
    emptyOutDir: true
  }
});
