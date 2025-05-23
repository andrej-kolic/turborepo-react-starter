import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReact from 'eslint-plugin-react';
import globals from 'globals';
import { config as baseConfig } from './base.js';

/**
 * A custom ESLint configuration for libraries that use React with Webpack.
 *
 * @type {import("eslint").Linter.Config} */
export const config = [
  // TODO: inherit from react?
  ...baseConfig,

  pluginReact.configs.flat.recommended,

  {
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
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      // React scope no longer necessary with new JSX transform.
      'react/react-in-jsx-scope': 'off',
    },
  },

  // {
  //   ignores: [
  //     '.*.js', // Ignore dotfiles
  //     'node_modules/',
  //     'dist/',
  //     'build',
  //     'turbo',
  //   ],
  // },
];
