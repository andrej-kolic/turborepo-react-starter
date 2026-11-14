# Check the bundle size

CI fails when an app's production build grows past a size limit. `Build: Auto` runs the check on every PR and every push to `develop` and `main`; `Build: Manual` has a "Check bundle size" switch; deploys skip it, like the other checks. The check is [size-limit](https://github.com/ai/size-limit) with `@size-limit/file`, which measures the built files, so it works the same for every bundler.

## Run it

```bash
pnpm check:size                       # all three bundler apps, builds them first
pnpm check:size --filter "$BUNDLER"   # one app
```

Over a limit, it fails and prints the excess:

```
JavaScript
Package size limit has exceeded by 88.17 kB
Size limit: 70 kB
Size:       158.17 kB brotlied
```

## Limits

All three apps share one set of limits, in [`packages/dev-tools/config/size-limit.ts`](../../packages/dev-tools/config/size-limit.ts): JavaScript, CSS, and everything a visitor downloads. Each app's `.size-limit.ts` re-exports it. Sizes are Brotli-compressed, as served.

## Raise a limit

First find what grew: compare the failing size with the last passing CI run. If the growth is intended, raise the limit in the same PR and say why in its description. Keep about 15% above the new size, so the check still catches the next regression.
