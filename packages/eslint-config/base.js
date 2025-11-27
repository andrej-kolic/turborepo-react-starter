import js from '@eslint/js';
import { globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import turboPlugin from 'eslint-plugin-turbo';
import tseslint from 'typescript-eslint';
// import onlyWarn from 'eslint-plugin-only-warn';
import globals from 'globals';

/**
 * Utility function to disable typed linting on provided files.
 * To be used in combination with type-checked linting (tseslint.configs.recommendedTypeChecked etc.)
 */
export function disableTypeCheck(files) {
  return tseslint.config({
    files,
    extends: [tseslint.configs.disableTypeChecked],
  })[0];
}

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config}
 */
export const config = tseslint.config(
  js.configs.recommended,
  eslintConfigPrettier,

  /** regular TS linting */

  // ...tseslint.configs.recommended,
  // ...tseslint.configs.strict,
  // ...tseslint.configs.stylistic,

  /** typed TS linting */

  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    // disable type checking for JS
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  /** TS custom configurations */

  {
    files: ['**/*.ts', '**/*.tsx'], // Apply these rules only to TypeScript files
    rules: {
      // Add new rules or override recommended ones
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // '@typescript-eslint/explicit-function-return-type': 'error',
      'no-console': 'warn', // Example of an ESLint core rule
      semi: ['error', 'always'],
      // '@typescript-eslint/no-explicit-any': 'off', // Example: turning off a rule

      /**
       * See
       * https://www.totaltypescript.com/type-vs-interface-which-should-you-use
       */
      '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],

      /**
       * Temporary disable due to bug in @typescript-eslint/unified-signatures v8.46.2
       * Error: "TypeError: typeParameters.params is not iterable"
       */
      '@typescript-eslint/unified-signatures': 'off',

      /**
       * Allow numbers in template expressions
       */
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
        },
      ],
    },
  },

  /** onlyWarn - use in combination with maxWarnings=0 */

  // {
  //   plugins: {
  //     onlyWarn,
  //   },
  // },
  // {
  //   ignores: ['dist/**'],
  // },

  /** Turbo: report undeclared variables (important for caching) */

  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'warn',
    },
  },

  /** other */

  {
    files: ['**/*.cjs'], // Target CommonJS files
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  {
    rules: {
      'no-useless-concat': 'error',
      'no-else-return': 'error',
    },
  },

  globalIgnores([
    // '.*.js', // Ignore dotfiles
    // '*.config.ts', // Ignore config files
    // 'compile/',
    'turbo/',
    '**/build/**',
    '**/dist/**',
    '**/test/**/*.d.ts', // Ignore generated test type definitions
  ]),
);
