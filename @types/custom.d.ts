/* eslint-disable import/no-default-export -- enable default exports */

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
