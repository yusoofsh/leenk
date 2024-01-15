/**
 * @param {string[]} filenames
 */
const eslintCommand = (filenames) =>
  `eslint --quiet --fix ${filenames.join(" ")}`;
/**
 * @param {string[]} filenames
 */
const prettierCommand = (filenames) =>
  `prettier --ignore-unknown --write ${filenames.join(" ")}`;

/** @type {import('@types/lint-staged').Config} */
module.exports = {
  /**
   * Lint & prettify TS and JS files
   * @param {string[]} filenames
   */
  "**/*.(astro|ts|js|cjs)": (filenames) => [
    eslintCommand(filenames),
    prettierCommand(filenames),
  ],
  /**
   * Prettify CSS, Markdown, and JSON files
   * @param {string[]} filenames
   */
  "**/*.(css|md|json)": (filenames) => prettierCommand(filenames),
};
