import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReact from 'eslint-plugin-react';
import globals from 'globals';
import { config as baseConfig } from './base.js';
import { config as reactConfig } from './react-internal.js';

/**
 * A custom ESLint configuration for libraries that use React with Webpack.
 *
 * @type {import("eslint").Linter.Config} */
export const config = [...reactConfig];
