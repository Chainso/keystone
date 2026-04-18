import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "fixtures/**",
      ".localflare/**",
      ".wrangler/**",
      "dist/**",
      "ui/dist/**",
      "worker-configuration.d.ts"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.serviceworker,
        ...globals.browser
      }
    }
  },
  {
    files: ["tests/**/*.ts", "ui/src/test/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.serviceworker,
        ...globals.vitest
      }
    }
  }
);
