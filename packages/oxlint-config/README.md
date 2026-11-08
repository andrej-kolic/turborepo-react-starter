# `@repo/oxlint-config`

Shared [oxlint](https://oxc.rs/docs/guide/usage/linter.html) configs. Each package's `oxlint.config.ts` exports one of them:

- `@repo/oxlint-config/base`: TypeScript packages without React.
- `@repo/oxlint-config/react`: React packages.

Type-aware rules run through the `--type-aware` flag in each package's `lint` script: oxlint rejects the `typeAware` option in a package config when it runs from the repo root, as lint-staged does.
