const { resolve } = require('node:path');

const project = resolve(process.cwd(), 'tsconfig.json');

/*
 * This is a custom ESLint configuration for use with
 * internal (bundled by their consumer) libraries
 * that utilize React.
 */

// TODO: add react extends, like 'plugin:react-hooks/recommended'

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    'eslint:recommended',
    'prettier',
    'turbo',
    // require.resolve("@vercel/style-guide/eslint/react"),
  ],
  plugins: ['only-warn'],
  parserOptions: {
    sourceType: 'module',
  },
  globals: {
    React: true,
    JSX: true,
  },
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project,
      },
    },
  },
  ignorePatterns: [
    '.*.js', // Ignore dotfiles
    '*.config.ts', // Ignore config files
    'node_modules/',
    'dist/',
    'build/',
    'compile/',
    'turbo/',
  ],
  overrides: [
    // Force ESLint to detect .tsx files
    { files: ['*.js?(x)', '*.ts?(x)'] },
  ],

  // typescript specific rules
  overrides: [
    {
      files: ['*.ts?(x)'], // Your TypeScript files extension

      // As mentioned in the comments, you should extend TypeScript plugins here,
      // instead of extending them outside the `overrides`.
      // If you don't want to extend any rules, you don't need an `extends` attribute.
      extends: [
        'plugin:@typescript-eslint/recommended-type-checked',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:@typescript-eslint/strict-type-checked',
        'plugin:@typescript-eslint/stylistic-type-checked',
        // require.resolve("@vercel/style-guide/eslint/typescript"),
      ],

      parser: '@typescript-eslint/parser',
      parserOptions: {
        project,
        projectService: true,
        tsconfigRootDir: __dirname,
      },

      rules: {
        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            fixStyle: 'inline-type-imports',
          },
        ],
        '@typescript-eslint/no-import-type-side-effects': 'error',
      },
    },
  ],
};
