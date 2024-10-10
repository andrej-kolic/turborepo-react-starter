/**
 * Type definitions for import.meta.env
 */

/** can be extended in package to contain specific keys */
interface ImportMetaEnv {
  readonly APP_REACT_TITLE: string;
  [string]: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
