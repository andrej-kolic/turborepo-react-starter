# Contributing

Issues and pull requests are welcome. For a larger change, open an issue first so we can agree on the approach. By taking part you accept the [Code of Conduct](CODE_OF_CONDUCT.md). Report security problems as described in [`SECURITY.md`](SECURITY.md), not in an issue.

## Set up

You need Node 26 (see [`.nvmrc`](.nvmrc)) and the pnpm version pinned in [`package.json`](package.json).

```bash
nvm use
cp .env.example .env
pnpm install
pnpm rules:install
pnpm dev:app
```

`pnpm rules:install` fetches the agent rules that `pnpm check:agents` compares against.

## Make a change

1. Branch from `main`.
2. Put the code in the package it belongs to: see [What's inside](README.md#whats-inside).
3. Add a test for new or changed behavior, and update the docs that describe it.
4. Run `pnpm quality-checks`: dependencies, security audit, unused code, agent files, links, format, types, lint and unit tests.
5. If the change affects the running app, also run the E2E tests: [`docs/template/e2e.md`](docs/template/e2e.md).

Guides for common changes: [a route](docs/template/routing.md), [a feature in `@repo/core`](docs/template/core.md), [an env variable](docs/template/env.md), [agent rules and skills](AGENTS.md#agent-config-rulesync).

## Open a pull request

1. Write commit messages and the PR title as [Conventional Commits](https://www.conventionalcommits.org), with a lowercase subject and a header of at most 72 characters. The `commit-msg` hook and CI check this: [`commitlint.config.js`](commitlint.config.js).
2. Open the PR against `main`, and link its issue with `Closes #123`.
3. The required CI checks must pass before it can merge.

By contributing, you agree that your work is released under the license of the folder you change: [MIT](LICENSE), or [Apache-2.0](infra/aws/LICENSE) in `infra/aws`.
