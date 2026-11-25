# Check the bundle size

CI fails when an app's production build grows past a size limit. `Verify: Build` runs the check for every bundler and build profile on every PR and every push to `main`; deploys skip it, like the other checks. The check is [size-limit](https://github.com/ai/size-limit) with `@size-limit/file`, which measures the built files, so it works the same for every bundler.

## Run it

```bash
pnpm check:size                           # the bare profile: all three bundler apps, builds them first
pnpm check:size --filter "$BUNDLER"       # one app
BUILD_PROFILE=features pnpm check:size    # the features profile
```

CI runs it on both [build profiles](build-profiles.md), `bare` and `features`. Without `BUILD_PROFILE`, `pnpm check:size` uses `bare`, so your `.env.local` never changes the result.

Over a limit, it fails and prints the excess:

```
JavaScript
Package size limit has exceeded by 53.17 kB
Size limit: 135 kB
Size:       188.17 kB brotlied
```

## Block merges that fail it

A failing check blocks a merge only when a ruleset requires it. Rulesets are repository settings, not files, so a repository made from this template needs its own. On GitHub, open **Settings → Rulesets**. If a ruleset already requires checks, add the four in step 4 to it. Otherwise choose **New ruleset → New branch ruleset**:

1. Fill in **Ruleset Name**, for example `Protect main`.
2. Set **Enforcement status** to **Active**.
3. Under **Target branches**, choose **Add target → Include by pattern** and add `main`.
4. Turn on **Require status checks to pass**, open **Show additional settings**, and choose **Add checks** for each of `Static checks + unit tests`, `Lint commit messages`, `All builds passed` and `All dev servers passed`. The size check fails `All builds passed`.
5. Click **Create**.

## Limits

All three apps share one set of limits, in [`packages/dev-tools/config/size-limit.ts`](../../packages/dev-tools/config/size-limit.ts): JavaScript, CSS, and everything a visitor downloads, each without the Sentry and mocked API files, then each of those on its own. A build without `APP_REACT_SENTRY_DSN` has no Sentry file, so it has no Sentry check; a `features` build always has one, so there a missing file fails. The mocked API's check covers `msw-browser-*.js` and `mockServiceWorker.js`, which a build with `APP_REACT_API_URL="mock"` loads before the first render; a build with an API URL has no `msw-browser` file, so it has no such check. Each app's `.size-limit.ts` re-exports it. Sizes are Brotli-compressed, as served.

## Raise a limit

First find what grew: compare the failing size with the last passing CI run. If the growth is intended, raise the limit in the same PR and say why in its description. Keep about 15% above the new size, so the check still catches the next regression.
