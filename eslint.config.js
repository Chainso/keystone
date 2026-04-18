import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const typeScriptLanguageOptions = {
  ecmaVersion: "latest",
  sourceType: "module"
};

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
    files: ["src/**/*.ts"],
    languageOptions: {
      ...typeScriptLanguageOptions,
      globals: {
        ...globals.serviceworker
      }
    }
  },
  {
    files: ["ui/src/**/*.{ts,tsx}"],
    languageOptions: {
      ...typeScriptLanguageOptions,
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: ["tests/**/*.ts"],
    languageOptions: {
      ...typeScriptLanguageOptions,
      globals: {
        ...globals.node,
        ...globals.serviceworker,
        ...globals.vitest
      }
    }
  },
  {
    files: ["ui/src/test/**/*.{ts,tsx}"],
    languageOptions: {
      ...typeScriptLanguageOptions,
      globals: {
        ...globals.browser,
        ...globals.vitest
      }
    }
  },
  {
    files: ["vite.config.ts", "vitest.config.ts", "scripts/**/*.ts"],
    languageOptions: {
      ...typeScriptLanguageOptions,
      globals: {
        ...globals.node
      }
    }
  }
);
