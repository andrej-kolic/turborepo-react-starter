Integrate workflows as a **GitHub Actions job** (or extra steps in an existing job). The repo already has the hard parts — copy setup from `verify-browser-smoke.yml` and artifact upload from `capture-devtools.yml`.

---

## Shared block (every workflow)

Reuse this in each job:

```yaml
env:
  HUSKY: 0
  BUILD_ENVIRONMENT: development
  CHROME_HEADLESS: 'true'
  CHROME_DEBUG_PORT: 9222
  BUNDLER: app-vite # or matrix value

steps:
  - uses: actions/checkout@v4
  - uses: pnpm/action-setup@v4
  - uses: actions/setup-node@v5
    with:
      node-version: 24
      cache: pnpm
  - run: pnpm install --frozen-lockfile

  # App running — pick ONE:
  # A) dev server (what smoke test uses today)
  - run: pnpm browser:ensure-app -- --log-file /tmp/app.log

  # B) production-like preview (perf / HAR checks)
  # - run: pnpm build:app
  # - run: pnpm preview:app &
  # - run: npx wait-on http://localhost:4173
  #   env:
  #     APP_URL: http://localhost:4173

  - run: pnpm chrome:debug
  - run: |
      for i in $(seq 1 10); do
        curl -sf http://localhost:9222/json/version && exit 0
        sleep 1
      done
      exit 1
```

Resolve URL in shell:

```bash
APP_URL="${APP_URL:-$(pnpm exec dev-tools-with-app-url node -e "import { resolveAppUrl } from '@repo/dev-tools/config/app-port'; console.log(resolveAppUrl(process.env))")}"
```

Or hardcode preview: `APP_URL=http://localhost:4173`.

Upload artifacts (always sanitize first — capture commands do it too, but CI re-runs for safety):

```yaml
- run: |
    for dir in packages/browser-capture/artifacts/*/; do
      [ -d "$dir" ] && node packages/browser-capture/bin/copilot-devtools.js sanitize-artifacts "$dir"
    done
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: browser-capture-${{ github.run_id }}
    path: packages/browser-capture/artifacts/**
    retention-days: 30
```

---

## Workflow 1 — Smoke failed → capture trace

**Where:** add steps to `verify-browser-smoke.yml` after the validate step.

**Trigger:** every PR (only runs capture when validate fails).

```yaml
- name: Assert app header renders
  id: smoke
  run: |
    pnpm browser validate \
      --selector "[data-testid=app-header]" \
      --no-console-errors

- name: Capture trace on smoke failure
  if: failure()
  run: |
    APP_URL=$(pnpm exec dev-tools-with-app-url node -p "process.env.APP_URL")
    node packages/browser-capture/bin/copilot-devtools.js record-trace "$APP_URL" --duration 5
  env:
    GITHUB_ACTOR: ${{ github.actor }}
    GITHUB_EVENT_NAME: ${{ github.event_name }}

- name: Upload debug artifacts
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: smoke-failure-trace-${{ matrix.bundler }}-${{ github.run_id }}
    path: packages/browser-capture/artifacts/**
```

**Note:** `browser:ensure-app` and `browser:setup` must still be up when capture runs — don't kill Chrome in cleanup until after this step.

---

## Workflow 2 — Perf gate ("page feels slow")

**Where:** new file `.github/workflows/verify-browser-perf.yml`.

**Trigger:** `pull_request` + optional `schedule` (nightly baseline).

```yaml
name: 'Verify: Browser perf'

on:
  pull_request:
  schedule:
    - cron: '0 6 * * 1' # weekly

jobs:
  perf:
    runs-on: ubuntu-latest
    steps:
      # ... shared setup ...
      - run: pnpm build:app
      - run: pnpm preview:app &
      - run: npx wait-on http://localhost:4173

      - name: Record performance
        run: |
          node packages/browser-capture/bin/copilot-devtools.js record-performance http://localhost:4173

      - name: Assert LCP budget
        run: |
          PERF=$(ls -d packages/browser-capture/artifacts/performance-* | tail -1)/performance.json
          LCP=$(node -e "const p=require('$PERF'); console.log(p.webVitals.lcp ?? 99999)")
          echo "LCP=${LCP}ms"
          [ "$(echo "$LCP <= 2500" | bc)" -eq 1 ] || exit 1
```

Tune the threshold. Upload artifact on failure so you can compare runs.

---

## Workflow 3 — On-demand PR trace

**Where:** extend `capture-devtools.yml` — swap `capture-snapshot` for `record-trace` and point at a URL.

**Trigger:** already there — `workflow_dispatch` + `/capture-trace` comment.

Add an input for URL (preview deploy):

```yaml
on:
  workflow_dispatch:
    inputs:
      url:
        description: 'App URL to trace'
        required: false

# in the capture step:
- name: Record trace
  run: |
    URL="${{ inputs.url }}"
    if [ -z "$URL" ]; then
      pnpm browser:ensure-app
      URL=$(pnpm exec dev-tools-with-app-url node -p "process.env.APP_URL")
    fi
    node packages/browser-capture/bin/copilot-devtools.js record-trace "$URL" --duration 10
```

For Netlify previews: pass the deploy URL via `workflow_dispatch` or read it from a PR comment bot / deploy status check.

---

## Workflow 4 — API contract from HAR

**Where:** new job in same perf workflow, or a step after `record-trace`.

**Trigger:** PR.

```yaml
- name: Record trace
  run: |
    node packages/browser-capture/bin/copilot-devtools.js record-trace http://localhost:4173 --duration 5

- name: Assert expected API calls
  run: |
    HAR=$(ls -d packages/browser-capture/artifacts/trace-* | tail -1)/har.json
    node -e "
      const har = require(process.argv[1]);
      const urls = har.log.entries.map(e => e.request.url);
      const bad = urls.filter(u => u.includes('/api/') && !urls.some(x => x.includes('/api/users')));
      if (urls.some(u => u.match(/\\/api\\/.+/))) {
        const failed = har.log.entries.filter(e => e.response.status >= 500);
        if (failed.length) { console.error('5xx:', failed.map(e => e.request.url)); process.exit(1); }
      }
    " "$HAR"
```

Replace assertions with your real endpoints. A small `scripts/assert-har.js` keeps the YAML readable.

---

## Workflow 5 — Flaky E2E capture on failure

**Prerequisite:** this repo has **no E2E suite yet** — only unit tests + browser smoke. You'd add Playwright tests first, then:

```yaml
- name: Run E2E
  id: e2e
  run: pnpm exec playwright test

- name: Capture trace on E2E failure
  if: failure()
  run: |
    node packages/browser-capture/bin/copilot-devtools.js record-trace http://localhost:4173 --duration 15

- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: e2e-failure-trace
    path: packages/browser-capture/artifacts/**
```

Same pattern as workflow 1: `if: failure()` after the step that can fail.

---

## What to add first (practical order)

| Priority | Workflow              | Effort                                  | File                       |
| -------- | --------------------- | --------------------------------------- | -------------------------- |
| 1        | Smoke failure → trace | ~15 lines in existing job               | `verify-browser-smoke.yml` |
| 2        | On-demand PR trace    | Change one command + optional URL input | `capture-devtools.yml`     |
| 3        | Perf gate             | New workflow + LCP assert               | `verify-browser-perf.yml`  |
| 4        | HAR contract          | New script + step after trace           | `scripts/assert-har.js`    |
| 5        | E2E failure capture   | Needs E2E tests first                   | new `e2e.yml`              |

---

## Gotchas from the code

- **`record-trace` / `record-performance`** spin up a **new** Playwright context — they only need Chrome on `:9222`, not an open tab.
- **`record-console`** needs an existing tab — useless in headless CI unless you `browser open` first.
- **`record-interactions`** needs a human clicking — not a CI fit.
- Set **`GITHUB_ACTOR`** / **`GITHUB_EVENT_NAME`** in env so `metadata.json` shows who triggered it.
- Use **`APP_URL`** for preview port (`4173` for vite) — `BUNDLER` alone resolves **dev** port (`5173`).

Want me to wire up workflow 1 (smoke failure capture) in the repo? That's the highest-value, lowest-effort starting point.
