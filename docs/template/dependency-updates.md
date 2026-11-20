# Update dependencies

Dependabot opens PRs that update the npm dependencies and GitHub Actions; nothing merges until you merge it. The setup is in [`.github/dependabot.yml`](../../.github/dependabot.yml); why it works this way: [0017](decisions/0017-exact-pins-updated-by-dependabot.md).

## Review the weekly PRs

Every Monday, Dependabot opens:

- one PR for all npm minor and patch updates, titled like `chore(deps): bump the npm-minor-and-patch group with 14 updates`;
- one PR per npm major update, such as `@testing-library/jest-dom` 7 → 8;
- one PR for all GitHub Actions updates.

A release is proposed once it is 3 days old. CI runs on each PR as on any other; merge it when it passes. If a PR needs code changes, push them to its branch; Dependabot then stops rebasing that PR. A PR you close is not opened again for that version.

## Run it now

Dependabot runs by itself when `.github/dependabot.yml` changes on `develop`. Otherwise, on GitHub open **Insights → Dependency graph → Dependabot**, click **Recent update jobs** next to `package.json`, then **Check for updates**.

A failed run shows a red icon next to `package.json` there; its log is under the repository's **Actions** tab, in the **Dependabot Updates** workflow. If the log says `ERR_PNPM_UNSUPPORTED_ENGINE`, see [0016](decisions/0016-node-engines-floor.md).

## Turn on security updates

Security updates open a PR as soon as an advisory has a fix, without waiting for Monday. They are repository settings, not files, so a repository made from this template turns them on itself:

```bash
gh api -X PUT repos/<owner>/<repo>/vulnerability-alerts       # Dependabot alerts
gh api -X PUT repos/<owner>/<repo>/automated-security-fixes   # security update PRs
gh api repos/<owner>/<repo>/automated-security-fixes          # prints {"enabled":true,...}
```
