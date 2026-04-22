import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const uiSrcRoot = fileURLToPath(new URL("./ui/src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(uiSrcRoot)
    }
  },
  test: {
    projects: [
      {
        test: {
          environment: "node",
          include: ["tests/**/*.test.ts"]
        }
      },
      {
        test: {
          environment: "jsdom",
          environmentOptions: {
            jsdom: {
              url: "http://localhost/"
            }
          },
          include: ["ui/src/test/**/*.test.tsx"],
          setupFiles: ["./ui/src/test/setup.ts"]
        }
      }
    ]
  }
});
