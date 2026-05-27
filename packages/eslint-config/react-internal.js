import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReact from 'eslint-plugin-react';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import { fixupConfigRules } from '@eslint/compat';
import { config as baseConfig } from './base.js';

/**
 * A custom ESLint configuration for libraries that use React.
 *
 * @type {import("eslint").Linter.Config} */
export const config = [
  ...baseConfig,

  /**
   * eslint-plugin-react uses deprecated context.getFilename() removed in ESLint 10.
   * fixupConfigRules patches the plugin's rules with the required shims.
   * Remove once eslint-plugin-react ships ESLint 10 support (v8+).
   */
  ...fixupConfigRules([pluginReact.configs.flat.recommended]),

  {
    // Merge browser + service worker globals on top of what the plugin sets
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  },

  {
    plugins: {
      'react-hooks': pluginReactHooks,
      'react-refresh': reactRefresh,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      // React scope no longer necessary with new JSX transform.
      'react/react-in-jsx-scope': 'off',

      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
];
