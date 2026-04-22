import { defineConfig } from "vitest/config";

export default defineConfig({
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
