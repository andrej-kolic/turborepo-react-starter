# Check the bundle size

CI fails when an app's production build grows past a size limit. `Build: Auto` runs the check on every PR and every push to `develop` and `main`; `Build: Manual` has a "Check bundle size" switch; deploys skip it, like the other checks. The check is [size-limit](https://github.com/ai/size-limit) with `@size-limit/file`, which measures the built files, so it works the same for every bundler.

## Run it

```bash
BUILD_PROFILE=features pnpm check:size                       # all three bundler apps, builds them first
BUILD_PROFILE=features pnpm check:size --filter "$BUNDLER"   # one app
```

CI runs it on both [build profiles](build-profiles.md), `bare` and `features`; set one locally too, so your `.env.local` doesn't change the build.

Over a limit, it fails and prints the excess:

```
JavaScript
Package size limit has exceeded by 85.17 kB
Size limit: 73 kB
Size:       158.17 kB brotlied
```

## Block merges that fail it

A failing check blocks a merge only when a ruleset requires it. Rulesets are repository settings, not files, so a repository made from this template needs its own. On GitHub, open **Settings → Rulesets**. If a ruleset already requires `Build project`, add `Build project (features)` to it as in step 4. Otherwise choose **New ruleset → New branch ruleset**:

1. Fill in **Ruleset Name**, for example `Protect develop and main`.
2. Set **Enforcement status** to **Active**.
3. Under **Target branches**, choose **Add target → Include by pattern** and add `develop`, then `main`.
4. Turn on **Require status checks to pass**, open **Show additional settings**, and choose **Add checks → `Build project`**, then **Add checks → `Build project (features)`**.
5. Click **Create**.

## Limits

All three apps share one set of limits, in [`packages/dev-tools/config/size-limit.ts`](../../packages/dev-tools/config/size-limit.ts): JavaScript, CSS, and everything a visitor downloads, each without Sentry's file, and Sentry's file on its own. A build without `APP_REACT_SENTRY_DSN` has no Sentry file, so it has no Sentry check; a `features` build always has one, so there a missing file fails. Each app's `.size-limit.ts` re-exports it. Sizes are Brotli-compressed, as served.

## Raise a limit

First find what grew: compare the failing size with the last passing CI run. If the growth is intended, raise the limit in the same PR and say why in its description. Keep about 15% above the new size, so the check still catches the next regression.
