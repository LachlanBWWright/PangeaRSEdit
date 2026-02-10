// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import functionalPlugin from "eslint-plugin-functional";

export default defineConfig(
  {
    ignores: [
      "eslint.config.js",
      "postcss.config.js",
      "tailwind.config.js",
      "playwright.config.ts",
      "debug-liquid-rsrcdump.js",
      "dist/**",
      "coverage/**",
    ],
  },
  [
    eslint.configs.recommended,
    tseslint.configs.strict,
    tseslint.configs.stylistic,
    reactHooks.configs.flat.recommended,
  ],
  {
    plugins: {
      "typescript-eslint": tseslint,
      "functional": functionalPlugin,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/no-unsafe-type-assertion": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      // Enforce Result types - ban throw statements and try/catch blocks
      "functional/no-throw-statements": "error",
      "functional/no-try-statements": "error",
    },
  },
  // Allow try/catch ONLY in result.ts utilities
  {
    files: ["src/types/result.ts"],
    rules: {
      "functional/no-throw-statements": "off",
      "functional/no-try-statements": "off",
    },
  },
  // Allow throw in test files (for test utilities and assertions)
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/tests/**"],
    rules: {
      "functional/no-throw-statements": "off",
    },
  },
);

/* import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    files: ["*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // "typescript-eslint/no-unsafe-type-assertion": "error",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
);
 */
