import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig(
  {
    ignores: [
      "dist",
      "coverage",
      "tests",
      "vitest.config.ts",
      "vitest.setup.ts",
      "node_modules",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.app.json", "./tsconfig.node.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Strict type safety rules - ban 'any' and type assertions
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      // Ban all type assertions (as Type)
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "never",
        },
      ],
      // Ban "as unknown as Type" double assertions
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSAsExpression > TSAsExpression > TSUnknownKeyword",
          message:
            'Avoid "as unknown as Type" double assertions. Use proper type guards, generics, or fix the underlying type issue instead.',
        },
      ],
      // Disable restrict-template-expressions check
      "@typescript-eslint/restrict-template-expressions": "off",
    },
  },
);
