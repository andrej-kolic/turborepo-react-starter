import { config as baseConfig } from './base.js';

export { disableTypeCheck } from './base.js';

/**
 * A custom ESLint configuration for vanilla js / ts libraries.
 *
 * @type {import("eslint").Linter.Config} */
export const config = [...baseConfig];
