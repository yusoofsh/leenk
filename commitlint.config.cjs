/** @type {import('@commitlint/types').QualifiedConfig} */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "chore",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "revert",
      ],
    ],
  },
};
