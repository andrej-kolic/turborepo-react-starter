// TODO: extends from @repo/eslint-config
// TODO: copied from app-vite, figure out proper configuration
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    '.eslintrc.cjs',
    'node_modules/',
    'dist/',
    'build/',
    'turbo/',
    'storybook-static',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
};
