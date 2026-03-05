import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "node_modules", ".storybook", "build-storybook"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // TypeScript rules
      "@typescript-eslint/explicit-function-return-types": "warn",
      "@typescript-eslint/explicit-member-accessibility": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",

      // React specific rules
      "react-refresh/only-export-components": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // General rules
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-empty": "error",
      "prefer-const": "warn",
      "no-var": "error",
      eqeqeq: ["error", "always"],

      // Code quality
      "no-duplicate-imports": "error",
      "no-empty-function": "off",
      "@typescript-eslint/no-empty-function": "off",
    },
  },
  {
    files: ["**/*.stories.{ts,tsx}"],
    rules: {
      "@typescript-eslint/explicit-function-return-types": "off",
    },
  },
]);
