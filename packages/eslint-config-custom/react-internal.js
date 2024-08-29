const { resolve } = require("node:path");

// const project = resolve(process.cwd(), "tsconfig.json");

/*
 * This is a custom ESLint configuration for use with
 * internal (bundled by their consumer) libraries
 * that utilize React.
 *
 * This config extends the Vercel Engineering Style Guide.
 * For more information, see https://github.com/vercel/style-guide
 *
 */

module.exports = {
  extends: [
    "@vercel/style-guide/eslint/browser",
    "@vercel/style-guide/eslint/react",
  ].map(require.resolve),
  parserOptions: {
    project: true,
  },
  globals: {
    JSX: true,
  },
  settings: {
    "import/resolver": {
      typescript: {
        project: true,
      },
    },
  },
  ignorePatterns: ["node_modules/", "dist/", ".eslintrc.js"],

  rules: {},

  // typescript specific rules
  overrides: [
    {
      files: ["*.ts", "*.tsx"], // Your TypeScript files extension

      // As mentioned in the comments, you should extend TypeScript plugins here,
      // instead of extending them outside the `overrides`.
      // If you don't want to extend any rules, you don't need an `extends` attribute.
      extends: [
        // "plugin:@typescript-eslint/recommended",
        // "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "@vercel/style-guide/eslint/typescript",
      ].map(require.resolve),

      parserOptions: {
        parser: "@typescript-eslint/parser",
        project: true,
        // project: ["./tsconfig.json"], // Specify it only for TypeScript files
        // or `project: true` in typescript-eslint version >= 5.52.0
      },

      rules: {
        "@typescript-eslint/consistent-type-imports": [
          "error",
          {
            fixStyle: "inline-type-imports",
          },
        ], // the replacement of "importsNotUsedAsValues": "error"
        "@typescript-eslint/no-import-type-side-effects": "error",
      },
    },
  ],
};
