/**
 * Asset imports every supported bundler handles the same way.
 * Load it only where no bundler client types are loaded: those declare the same modules and clash.
 */

/** Side-effect import only: no bundler here gives CSS a default export. */
declare module '*.css' {}

/** URL of the emitted file. */
declare module '*.svg' {
  const url: string;
  export default url;
}

/** URL of the emitted file. */
declare module '*.png' {
  const url: string;
  export default url;
}
