# The Node `engines` floor is what the dependencies need, not `.nvmrc`

- Status: accepted
- Date: 2026-11-20

## Context

`package.json` set `engines.node` to `>=26.0.0` to match `.nvmrc` (`50ed0e4`), and `engineStrict: true` in `pnpm-workspace.yaml` makes pnpm refuse any other Node (`c88a748`, added because jsdom 31 needs Node 24.15+). Dependabot's updater runs its own Node, 24.22.3 on 2026-11-20, and `dependabot.yml` has no setting to change it ([dependabot-core #7426](https://github.com/dependabot/dependabot-core/issues/7426)). So every npm update failed ([run 44767553291](https://github.com/andrej-kolic/turborepo-react-starter/actions/runs/44767553291)):

```
ERR_PNPM_UNSUPPORTED_ENGINE  wanted: {"node":">=26.0.0"} (current: {"node":"24.22.3"})
```

## Decision

- `engines.node` is `>=24.15.0`, the lowest Node every locked package accepts. jsdom 31 sets it: `^22.22.2 || ^24.15.0 || >=26.0.0`. All 1157 engine ranges in `pnpm-lock.yaml` accept 24.15.0, except `@img/sharp-win32-ia32`, an optional Windows binary whose `^20.9.0` rejects Node 26 too.
- `engineStrict` stays on, so Node below 24.15 still fails `pnpm install`.
- `.nvmrc`, CI and local development stay on Node 26.

Checked with `pnpm install --lockfile-only` on Node 24.22.3: `>=26.0.0` fails as above, `>=24.15.0` passes.

## Rejected

- Turning `engineStrict` off: installing on a Node the dependencies don't support becomes a warning, for everyone.
- Removing the npm entry from `dependabot.yml`: dependencies would again move only when someone bumps them by hand ([0017](0017-exact-pins-updated-by-dependabot.md)).

## Consequences

- Node 24.15 to 25 install, but nothing tests them: CI runs Node 26 only.
- An update to a dependency that needs Node 26 fails Dependabot's run with the error above.
- Once Dependabot's updater runs Node 26, the floor can follow `.nvmrc` again.
