/**
 * @param {string[]} filenames
 */
const quoteFilenames = (filenames) => filenames.map(JSON.stringify).join(" ");

/**
 * @param {string[]} filenames
 */
const oxlintCommand = (filenames) =>
  `oxlint --type-aware --fix ${quoteFilenames(filenames)}`;

/**
 * @param {string[]} filenames
 */
const oxfmtCommand = (filenames) =>
  `oxfmt --write ${quoteFilenames(filenames)}`;

/** @type {import('@types/lint-staged').Config} */
module.exports = {
  /**
   * Lint and format JavaScript and TypeScript files.
   * @param {string[]} filenames
   */
  "**/*.{ts,tsx,js,jsx,cjs,mjs}": (filenames) => [
    oxlintCommand(filenames),
    oxfmtCommand(filenames),
  ],
  /**
   * Format file types supported by Oxfmt.
   * @param {string[]} filenames
   */
  "**/*.{css,html,json,jsonc,md,toml,yaml,yml}": (filenames) =>
    oxfmtCommand(filenames),
};
