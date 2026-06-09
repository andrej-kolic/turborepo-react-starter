// prettier.config.js, .prettierrc.js, prettier.config.mjs, or .prettierrc.mjs

/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
const config = {
  singleQuote: true,
  // trailingComma: "es5",
  // tabWidth: 4,
  // semi: false,
  overrides: [
    {
      // VS Code's jsonc validator warns on trailing commas unless a schema
      // sets allowTrailingCommas; match strict .json behavior instead.
      files: ['*.jsonc'],
      options: { trailingComma: 'none' },
    },
  ],
};

export default config;
