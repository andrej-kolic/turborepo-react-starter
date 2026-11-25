import { z } from 'zod';

// TODO: extract into its own package (e.g. @repo/env-schema) when the React Native app needs it without the web asset types.

const API_URL_MESSAGE =
  'must be "mock" or the API\'s URL: see docs/template/env.md#the-mocked-api';

/**
 * Shape of the `import.meta.env` values the bundlers inject into the app.
 * Strict: an `APP_REACT_*` variable missing from here fails the build, so add new ones here first.
 */
export const environmentSchema = z.strictObject({
  BUILD_ENVIRONMENT: z.enum(['development', 'staging', 'production']),
  BUNDLER: z.enum(['web-vite', 'web-rspack', 'web-esbuild']),
  MODE: z.string().min(1),
  // true in a production build, false in the dev server; MODE names the build environment instead.
  PROD: z.boolean(),
  // The git commit the build is made from, for the Sentry release name; unset outside a git checkout.
  GIT_COMMIT: z
    .string()
    .regex(/^[0-9a-f]{40}$/)
    .optional(),

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
  // Optional, like a real switch; GUARD_ON is "true" in packages/web/.env, and no committed file sets GUARD_OFF.
  APP_REACT_GUARD_ON: z.literal('true').optional(),
  APP_REACT_GUARD_OFF: z.literal('true').optional(),

  // The todo API's base URL, or "mock" to run the mocked API in the browser (docs/template/env.md#the-mocked-api).
  // Trailing slashes are dropped: the API functions append paths that start with one.
  APP_REACT_API_URL: z
    .union(
      [
        z.literal('mock'),
        z.url(API_URL_MESSAGE).refine((url) => !/[?#]/.test(url), {
          message:
            'must not have a query string or #: the API functions append paths to it',
        }),
      ],
      API_URL_MESSAGE,
    )
    .transform((value) => value.replace(/\/+$/, '')),

  // Unset turns error reporting off; see docs/template/error-reporting.md.
  // An empty value counts as unset: CI passes an empty string when the repo variable doesn't exist.
  APP_REACT_SENTRY_DSN: z
    .union([z.url(), z.literal('')])
    .transform((value) => value || undefined)
    .optional(),
  // Share of visits that send Web Vitals, 0 to 1; only builds with APP_REACT_SENTRY_DSN use it.
  // Unset or empty is 0.1: z.coerce.number() alone would turn "" into 0 and stop Web Vitals silently.
  APP_REACT_SENTRY_TRACES_SAMPLE_RATE: z
    .union([
      z.literal('').transform(() => undefined),
      z.coerce.number().min(0).max(1),
    ])
    .optional()
    .transform((value) => value ?? 0.1),
});

/** Validated environment values; `env.d.ts` builds `import.meta.env` types from it. */
export type EnvironmentVariables = z.infer<typeof environmentSchema>;
