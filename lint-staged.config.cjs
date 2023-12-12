const eslintCommand = (filenames) =>
  `eslint --quiet --fix ${filenames.join(" ")}`;
const prettierCommand = (filenames) =>
  `prettier --ignore-unknown --write ${filenames.join(" ")}`;

/** @type {import('@types/lint-staged').Config} */
module.exports = {
  // Sort package.json keys
  "package.json": "prettier-package-json --write",
  // Lint & prettify TS and JS files
  "**/*.(ts|tsx|js)": (filenames) => [
    eslintCommand(filenames),
    prettierCommand(filenames),
  ],
  // Prettify CSS, Markdown, and JSON files
  "**/*.(css|md|json)": prettierCommand,
};
