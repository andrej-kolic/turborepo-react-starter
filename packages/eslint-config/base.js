import js from '@eslint/js';
import { globalIgnores } from "eslint/config";
import eslintConfigPrettier from 'eslint-config-prettier';
import turboPlugin from 'eslint-plugin-turbo';
import tseslint from 'typescript-eslint';
// import onlyWarn from 'eslint-plugin-only-warn';
import globals from 'globals';

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,

  globalIgnores(["turbo/"]),

  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'warn',
    },
  },
  // {
  //   plugins: {
  //     onlyWarn,
  //   },
  // },
  // {
  //   ignores: ['dist/**'],
  // },

  {
    files: ['**/*.cjs'], // Target CommonJS files
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
];
