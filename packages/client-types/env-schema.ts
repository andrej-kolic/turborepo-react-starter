import { z } from 'zod';

// TODO: extract into its own package (e.g. @repo/env-schema) when the React Native app needs it without the web asset types.

/**
 * Shape of the `import.meta.env` values the bundlers inject into the app.
 * Strict: an `APP_REACT_*` variable missing from here fails the build, so add new ones here first.
 */
export const environmentSchema = z.strictObject({
  BUILD_ENVIRONMENT: z.enum(['development', 'staging', 'production']),
  BUNDLER: z.enum(['app-vite', 'app-rspack', 'app-esbuild']),
  MODE: z.string().min(1),

  APP_REACT_ENV_FILE: z.string().min(1),
  APP_REACT_TITLE: z.string().min(1),
  // Regex recommended by semver.org: https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
  APP_REACT_VERSION: z
    .string()
    .regex(
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
      'must be a semver version like 1.2.3 or 1.2.3-rc.1',
    ),

  // Test switches: `pnpm check:env-guards` checks that every build keeps the code GUARD_ON guards and drops the code GUARD_OFF guards.
  // Optional, like a real switch; GUARD_ON is "true" in packages/app-core/.env, and no committed file sets GUARD_OFF.
  APP_REACT_GUARD_ON: z.literal('true').optional(),
  APP_REACT_GUARD_OFF: z.literal('true').optional(),
});

/** Validated environment values; `env.d.ts` builds `import.meta.env` types from it. */
export type EnvironmentVariables = z.infer<typeof environmentSchema>;
