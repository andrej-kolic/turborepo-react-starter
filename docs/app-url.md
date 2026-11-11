# App URL

Reference for how browser tools, capture and E2E find the app URL. Why it works this way: [`decisions/0001-target-url-override.md`](decisions/0001-target-url-override.md).

## Ports

Each bundler app declares `devPort` and `previewPort` in its `package.json` (e.g. `apps/app-vite/package.json`). Bundler configs and `@repo/dev-tools/config/app-port` read them from there; browser tooling gets the URL through `dev-tools-app-target run` ([CLI chains](#cli-chains)). Vite uses `strictPort: true`, so the declared port is the listening port. `PORT` is not read; set `TARGET_URL` instead.

## Resolution order

`resolveAppUrl(env, mode)` in [`packages/dev-tools/config/app-port.ts`](../packages/dev-tools/config/app-port.ts):

1. `TARGET_URL` set → used as-is, in any mode (dev, preview, remote, Storybook canvas)
2. `mode: 'dev'` and `BUNDLER` set → `devPort` from `apps/<BUNDLER>/package.json`
3. `mode: 'preview'` and `BUNDLER` set → `previewPort` from `apps/<BUNDLER>/package.json`
4. else → `null`; `dev-tools-app-target` and E2E turn it into an error with a hint

E2E uses the preview mode through `resolvePreviewAppTarget()` in [`packages/e2e/lib/resolve-preview-target.ts`](../packages/e2e/lib/resolve-preview-target.ts).

## Environment variables

| Variable      | Role                                                         | In `.env` |
| ------------- | ------------------------------------------------------------ | --------- |
| `TARGET_URL`  | Override for every browser, capture and E2E target           | No        |
| `BUNDLER`     | Which app's `package.json` ports give the default            | Yes       |
| `CAPTURE_URL` | Capture-only fallback when no positional URL or `TARGET_URL` | Optional  |

A `TARGET_URL` exported in a shell is inherited by child shells. A leftover localhost value from browser work makes `pnpm e2e` hit the dev server instead of the preview. `dev-tools-app-target` and E2E print a warning when a localhost `TARGET_URL` differs from the mode default; remote values are not warned. Run `unset TARGET_URL` before preview or E2E.

## CLI chains

| Tool             | URL order                                         |
| ---------------- | ------------------------------------------------- |
| `pnpm browser …` | `--url` → `TARGET_URL` → error                    |
| `pnpm capture …` | positional → `TARGET_URL` → `CAPTURE_URL` → error |

Root `pnpm browser:*` and `pnpm capture` scripts run through `dev-tools-app-target run`, which sets `TARGET_URL` to the dev URL from `BUNDLER` when it is unset. The CLIs do not read `BUNDLER` themselves. CI workflows set only `BUNDLER` and derive the URL with `dev-tools-app-target` (`url`, or `resolve --preview` for E2E and perf); only a manual trace run with a given URL passes its own.

## `dev-tools-app-target`

| Subcommand            | Prints                                     |
| --------------------- | ------------------------------------------ |
| `url [--preview]`     | Dev URL, or preview URL with `--preview`   |
| `port [--preview]`    | Dev port, or preview port with `--preview` |
| `resolve [--preview]` | URL and port, tab-separated                |
| `run <command>`       | Runs the command with `TARGET_URL` set     |

A set `TARGET_URL` wins over `--preview` in every subcommand.

`pnpm browser:ensure-app` starts the dev server if needed and prints `App: UP <url>`. Add `-- --log-file <path>` to save the dev-server output, as CI does to debug startup failures.

## Storybook canvas

`pnpm browser …` does not reach inside Storybook's manager iframe. Use the canvas URL `${loadAppEndpoints('ui-storybook').devUrl}/iframe.html?id=<story-id>` from `app-port.ts`, not `?path=/story/…`. Story IDs: `Example/DynamicList` + `Default` → `example-dynamiclist--default`.
