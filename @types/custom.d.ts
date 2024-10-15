/* eslint-disable import/no-default-export -- enable default exports */

/**
 * Type definitions for import.meta.env
 */

/** can be extended in package to contain specific keys */
interface ImportMetaEnv {
  readonly BUNDLER: string;
  readonly APP_REACT_TITLE: string;
  readonly APP_REACT_ENV_FILE: string;

  readonly [key: string]: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * # Custom
 *
 * See: https://webpack.js.org/guides/typescript/#importing-other-assets
 *      https://github.com/mrmckeb/typescript-plugin-css-modules#custom-definitions
 *
 * TODO: check vite/client types
 */

declare module "*.module.css" {
  const selectors: Record<string, string>;
  export default selectors;
}

declare module "*.css" {
  const content: string;
  export default content;
}

// TODO: fix relative path
// NOTE: asset JavaScript files have to be referenced with an additional specifier end such as '?'
// declare module './assets/*' {
//   const reference: string;
//   export default reference;
// }

// NOTE: asset JavaScript files have to be referenced with an additional specifier end such as '?'
declare module "~/assets/*" {
  const reference: string;
  export default reference;
}

declare module "*.png" {
  const reference: string;
  export default reference;
}

declare module "*.svg" {
  const reference: string;

  // _eslint-disable-next-line import/no-default-export
  export default reference;
}
