/**
 * `import.meta.env` keys every supported bundler injects.
 * Load it in each client package that reads them, beside the bundler's own client types where it has them.
 */
interface ImportMetaEnv {
  // Not readonly: vite/client declares MODE mutable, and merged declarations must match.
  MODE: string;
  readonly BUNDLER: string;
  readonly BUILD_ENVIRONMENT: string;

  readonly APP_REACT_TITLE: string;
  readonly APP_REACT_ENV_FILE: string;
  readonly APP_REACT_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
