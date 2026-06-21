import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import svelte from "eslint-plugin-svelte";
import ts from "typescript-eslint";

export default ts.config(
  {
    ignores: [".svelte-kit/", "build/"],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
    rules: {
      "no-undef": "off",
      "svelte/no-navigation-without-resolve": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "svelte/require-each-key": "off",
      "svelte/prefer-writable-derived": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
