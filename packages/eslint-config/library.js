import { config as baseConfig } from './base.js';

export { disableTypeCheck } from './base.js';

/**
 * A custom ESLint configuration for vanilla js / ts libraries.
 *
 * @type {import("eslint").Linter.Config} */
export const config = [
  ...baseConfig,

  // {
  //   ignores: [
  //     '.*.js', // Ignore dotfiles
  //     '*.config.ts', // Ignore config files
  //     'node_modules/',
  //     'dist/',
  //     'build/',
  //     'compile/',
  //     'turbo/',
  //   ],
  // },

  // pluginReact.configs.flat.recommended,

  // {
  //   languageOptions: {
  //     ...pluginReact.configs.flat.recommended.languageOptions,
  //     globals: {
  //       ...globals.serviceworker,
  //       // no browser
  //     },
  //   },
  // },

  // {
  //   plugins: {
  //     'react-hooks': pluginReactHooks,
  //   },
  //   settings: { react: { version: 'detect' } },
  //   rules: {
  //     ...pluginReactHooks.configs.recommended.rules,
  //     // React scope no longer necessary with new JSX transform.
  //     'react/react-in-jsx-scope': 'off',
  //   },
  // },
];
