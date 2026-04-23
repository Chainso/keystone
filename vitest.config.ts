import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, defineProject } from "vitest/config";

const uiSrcRoot = fileURLToPath(new URL("./ui/src", import.meta.url));

export default defineConfig({
  test: {
    projects: [
      defineProject({
        test: {
          environment: "node",
          include: ["tests/**/*.test.ts"]
        }
      }),
      defineProject({
        resolve: {
          alias: {
            "katex/dist/katex.min.css": resolve(uiSrcRoot, "test/style-stub.ts"),
            "@": resolve(uiSrcRoot)
          }
        },
        test: {
          environment: "jsdom",
          environmentOptions: {
            jsdom: {
              url: "http://localhost/"
            }
          },
          include: ["ui/src/test/**/*.test.tsx"],
          server: {
            deps: {
              inline: ["@platejs/math", "katex"]
            }
          },
          setupFiles: ["./ui/src/test/setup.ts"]
        }
      })
    ]
  }
});
