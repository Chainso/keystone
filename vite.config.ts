import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const uiRoot = fileURLToPath(new URL("./ui", import.meta.url));
const uiSrcRoot = resolve(uiRoot, "src");

export default defineConfig({
  root: uiRoot,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": uiSrcRoot
    }
  },
  build: {
    outDir: resolve(uiRoot, "../dist"),
    emptyOutDir: true
  }
});
