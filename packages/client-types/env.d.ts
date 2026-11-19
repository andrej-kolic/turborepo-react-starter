/**
 * `import.meta.env` keys every supported bundler injects, generated from the env schema the build validates against.
 * Load it in each client package that reads them, beside the bundler's own client types where it has them.
 */
// Inline import(): a top-level import would make this file a module, and ImportMetaEnv would stop merging globally.
type RepoBundlerEnv = Readonly<
  Omit<import('./env-schema').EnvironmentVariables, 'MODE'>
>;

// Named as in vite/client and @rsbuild/core, so it merges with their ImportMetaEnv; a different name conflicts on ImportMeta.env.
interface ImportMetaEnv extends RepoBundlerEnv {
  // Not readonly: vite/client declares MODE this way, and merged declarations must match.
  MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
