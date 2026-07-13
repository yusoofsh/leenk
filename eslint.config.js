import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import astroPlugin from "eslint-plugin-astro";
import astroParser from "astro-eslint-parser";
import jsxA11y from "eslint-plugin-jsx-a11y";
import perfectionist from "eslint-plugin-perfectionist";

export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        astroHTML: "readonly",
      },
      parser: tsParser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "jsx-a11y": jsxA11y,
      perfectionist,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs["recommended-type-checked"].rules,
      ...tsPlugin.configs["stylistic-type-checked"].rules,
      ...jsxA11y.flatConfigs.strict.rules,
      ...perfectionist.configs["recommended-natural"].rules,
    },
  },
  {
    files: ["**/*.astro"],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        extraFileExtensions: [".astro"],
        parser: tsParser,
      },
    },
    plugins: {
      astro: astroPlugin,
    },
    rules: {
      ...astroPlugin.configs.recommended.rules,
      ...astroPlugin.configs["jsx-a11y-strict"].rules,
    },
  },
  {
    ignores: [
      "**/dist/",
      "**/.astro/",
      "**/.wrangler/",
      "**/node_modules/",
      "**/.DS_Store",
      "eslint.config.js",
      ".eslintrc.cjs",
    ],
  },
];
