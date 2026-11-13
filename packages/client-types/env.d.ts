/**
 * `import.meta.env` keys every supported bundler injects, generated from the env schema the build validates against.
 * Load it in each client package that reads them, beside the bundler's own client types where it has them.
 */
// Inline import(): a top-level import would make this file a module, and ImportMetaEnv would stop merging globally.
type RepoBundlerEnv = Readonly<
  Omit<import('./env-schema').EnvironmentVariables, 'MODE'>
>;

interface ImportMetaEnv extends RepoBundlerEnv {
  // Required and not readonly: vite/client declares MODE this way, and merged declarations must match.
  // The schema allows it to be missing because Vite sets it after the env is loaded.
  MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
