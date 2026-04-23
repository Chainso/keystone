import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const uiRoot = fileURLToPath(new URL("./ui", import.meta.url));
const uiSrcRoot = resolve(uiRoot, "src");
const uiDevProxyTarget =
  process.env.KEYSTONE_DEV_PROXY_TARGET ??
  process.env.KEYSTONE_BASE_URL ??
  "http://127.0.0.1:8787";

export default defineConfig({
  root: uiRoot,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": uiSrcRoot
    }
  },
  server: {
    host: "127.0.0.1",
    proxy: {
      "/agents": {
        changeOrigin: true,
        target: uiDevProxyTarget,
        ws: true
      },
      "/healthz": {
        changeOrigin: true,
        target: uiDevProxyTarget
      },
      "/internal": {
        changeOrigin: true,
        target: uiDevProxyTarget
      },
      "/v1": {
        changeOrigin: true,
        target: uiDevProxyTarget
      }
    }
  },
  build: {
    outDir: resolve(uiRoot, "../dist"),
    emptyOutDir: true
  }
});
