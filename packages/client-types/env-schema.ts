import { z } from 'zod';

// TODO: extract into its own package (e.g. @repo/env-schema) when the React Native app needs it without the web asset types.

/**
 * Shape of the `import.meta.env` values the bundlers inject into the app.
 * Strict: an `APP_REACT_*` variable missing from here fails the build, so add new ones here first.
 */
export const environmentSchema = z.strictObject({
  BUILD_ENVIRONMENT: z.enum(['development', 'staging', 'production']),
  BUNDLER: z.enum(['app-vite', 'app-rspack', 'app-esbuild']),
  // Optional because Vite sets MODE itself from --mode.
  MODE: z.string().min(1).optional(),

  APP_REACT_ENV_FILE: z.string().min(1),
  APP_REACT_TITLE: z.string().min(1),
  APP_REACT_VERSION: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'must be a semver version like 1.2.3'),
});

/** Validated environment values; `env.d.ts` builds `import.meta.env` types from it. */
export type EnvironmentVariables = z.infer<typeof environmentSchema>;
