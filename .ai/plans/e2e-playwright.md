# Plan: Playwright E2E for enterprise template starter

**Status:** Phases 1–4 complete (Option A)  
**Branch:** `develop`  
**Created:** 2026-06-21  
**Phase 1 completed:** 2026-06-24  
**Phase 2 completed:** 2026-06-24  
**Phase 3 completed:** 2026-06-24  
**Phase 4 completed:** 2026-06-24 (Option A — smoke HTTP 200 only)

## How to run (new chat)

Attach or `@`-mention this file — no need to paste instructions separately.

**Minimal prompt:**

```text
Implement the E2E plan in .ai/plans/e2e-playwright.md. Read AGENTS.md first.
```

**Full agent instructions:**

```text
Implement this plan. Read AGENTS.md first.

- Turborepo monorepo, branch develop.
- Industry standard: @playwright/test (not a custom runner). Do NOT replace browser-tools or browser-capture.
- E2E = CI/regression truth. browser-tools = agent dev eyes (no MCP). Keep that split in docs.
- Use @repo/dev-tools / dev-tools-app-target for URL resolution (same as browser tooling).
- Execute phase-by-phase; run pnpm lint, pnpm test, pnpm check:type after each phase.
- Default E2E CI target: `DEFAULT_BUNDLER` preview (single bundler). Multi-bundler dev boot stays in verify-browser-smoke.yml.

If the plan is already partially done, read git status and skip completed tasks.
```

---

## Executive summary

Add **Playwright Test** (`@playwright/test`) as the canonical browser regression layer for this enterprise template starter. E2E runs against a **production preview** build (not the dev server). CI gets a dedicated workflow; local dev gets `pnpm e2e`.

**Custom repo concerns** (multi-bundler, agent browser-tools) stay separate:

| Layer        | Tool                  | Role                                                          |
| ------------ | --------------------- | ------------------------------------------------------------- |
| Unit         | Vitest + RTL          | Component logic (jsdom)                                       |
| **E2E**      | **Playwright Test**   | **User-visible flows + regional gates in CI**                 |
| Smoke        | dev server boot       | All bundlers HTTP 200 (matrix)                                |
| Agent verify | browser-tools + skill | Eyes while developing (no MCP)                                |
| Capture      | browser-capture       | Debug artifacts on failure (optional E2E hook)                |
| Storybook    | ui-storybook          | Isolated component dev; Chromatic later for visual regression |

**Do not:** Cypress, custom YAML spec runners, duplicate every E2E assertion in browser-tools CLI.

**Already in repo:** `playwright-core` (browser-tools, browser-capture). E2E adds `@playwright/test` + browser install + test runner — different package, shared ecosystem.

---

## Decisions (locked in)

| #   | Decision                                                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Playwright Test** — `@playwright/test`, not playwright-core alone                                                                                                                                                                                              |
| 2   | **Preview target** — `pnpm build:app` → `pnpm preview:app` → E2E against `previewUrl` from `app-port.ts`                                                                                                                                                         |
| 3   | **CI bundler** — E2E on **`DEFAULT_BUNDLER`** (fallback `app-vite`); smoke matrix keeps all three bundlers on dev server                                                                                                                                         |
| 4   | **Layout** — `packages/e2e/`                                                                                                                                                                                                                                     |
| 5   | **Locators** — `getByTestId` for registered page regions per [`docs/component-validation-contract.md`](../../docs/component-validation-contract.md); `getByRole` / `getByText` for user flows (clicks, forms, navigation). v1 is region-only → all `getByTestId` |
| 6   | **Keep browser-tools** — agent dev feedback; do not merge into Playwright                                                                                                                                                                                        |
| 7   | **Traces** — Playwright native `retain-on-failure`; browser-capture on E2E failure is optional follow-up                                                                                                                                                         |
| 8   | **Browser matrix** — Chromium only for v1                                                                                                                                                                                                                        |

---

## Validation map (document in AGENTS.md)

```text
While developing:  browser snapshot / screenshot / validate  (browser-tools, no MCP)
CI regression:     Playwright E2E on preview build
Multi-bundler boot: verify-browser-smoke.yml (all bundlers)
Debug on failure:  Playwright trace (+ optional browser-capture)
```

---

## Current state

- ✅ `@repo/e2e` — Playwright config, `tests/app.spec.ts`, `@playwright/test` in catalog
- ✅ `fixtures/app-target.ts` — `appTarget` fixture via `dev-tools-app-target` / `resolveAppTargets`
- ✅ `lib/resolve-preview-target.ts` — shared preview URL resolution for config + fixture
- ✅ `pages/app.page.ts` — Page Object Model for registered page regions
- ✅ Root scripts: `pnpm e2e`, `e2e:ui`, `e2e:headed` (via `pnpm --filter`; not in Turbo graph)
- ✅ README local workflow (build → preview → `pnpm e2e`)
- ✅ CI: `.github/workflows/verify-e2e.yml` (`DEFAULT_BUNDLER` preview gate)
- ✅ Docs: validation map in AGENTS.md, `docs/e2e.md` (Phase 3)
- CI smoke: [`verify-browser-smoke.yml`](../../.github/workflows/verify-browser-smoke.yml) — dev server boot + HTTP 200 (all bundlers)
- CI perf (preview bootstrap pattern): [`verify-browser-perf.yml`](../../.github/workflows/verify-browser-perf.yml)
- [`docs/component-validation-contract.md`](../../docs/component-validation-contract.md) — `data-testid` registry: `app-header`, `resource-cards`, `scroller`

---

## Target architecture

```mermaid
flowchart TB
  subgraph ci ["CI"]
    BUILD[pnpm build:app]
    PREVIEW[pnpm preview:app]
    E2E[pnpm e2e]
    BUILD --> PREVIEW --> E2E
  end

  subgraph agent ["Agent dev loop"]
    ENSURE[pnpm browser:ensure-app]
    SNAP[pnpm browser snapshot]
    ENSURE --> SNAP
  end

  subgraph packages ["Packages"]
    E2E_PKG[packages/e2e]
    TOOLS[@repo/browser-tools]
    CAP[@repo/browser-capture]
  end

  E2E --> E2E_PKG
  agent --> TOOLS
  ci -. optional on failure .-> CAP
```

### Target layout — `packages/e2e`

```
packages/e2e/
  package.json
  playwright.config.ts      # baseURL via lib/resolve-preview-target
  tsconfig.json
  lib/
    resolve-preview-target.ts
  fixtures/
    app-target.ts           # test.extend — appTarget fixture
  pages/
    app.page.ts             # Page Object Model — region locators + assertions
  tests/
    app.spec.ts             # smoke-level: load, regions, no console errors
```

### Root scripts (target)

```json
{
  "e2e": "dotenv -- pnpm --filter @repo/e2e e2e",
  "e2e:ui": "dotenv -- pnpm --filter @repo/e2e e2e:ui",
  "e2e:headed": "dotenv -- pnpm --filter @repo/e2e e2e:headed"
}
```

---

## Phased execution

Execute as separate PRs when possible. Each phase ends with quality gate.

### Phase 1 — Package scaffold + local run ✅ DONE

**Goal:** `pnpm e2e` passes locally against preview.

1. ✅ Create `packages/e2e` with `@playwright/test`, extend `@repo/typescript-config`
2. ✅ Add `@playwright/test` to `pnpm-workspace.yaml` catalog
3. ✅ `playwright.config.ts`:
   - `baseURL: resolveAppUrl(process.env, 'preview')` — override via `TARGET_URL`; see [target-url-unification.md](./target-url-unification.md)
   - `retain-on-failure` trace, screenshot on failure
   - Chromium only
4. ✅ First spec `tests/app.spec.ts`:
   - Page loads (`main` visible)
   - `getByTestId('app-header')`, `resource-cards`, `scroller` visible
   - Fail on `console.error` on load
5. ✅ Root scripts: `e2e`, `e2e:ui`, `e2e:headed`
6. ✅ Document local workflow in README snippet

**Post–Phase 1 refinements (same PR / follow-ups):**

- Package script named `e2e` (not `test`) so `pnpm test` stays unit-only
- E2E intentionally **not** in `turbo.json` — invoked via `pnpm --filter`
- `install:browsers` for first-time Chromium install (`setup` conflicts with pnpm global)

**Verification:**

```bash
pnpm build:app
pnpm preview:app &
pnpm e2e
pnpm lint && pnpm test && pnpm check:type
```

---

### Phase 2 — CI workflow ✅ DONE

**Goal:** PR gate runs E2E on preview (`DEFAULT_BUNDLER`).

1. ✅ New `.github/workflows/verify-e2e.yml`:
   - Reuse bootstrap from `verify-browser-perf.yml` (build → preview → wait-on)
   - `pnpm --filter @repo/e2e install:browsers`
   - `pnpm e2e` with `TARGET_URL` from `dev-tools-app-target resolve --preview`
   - Upload Playwright report/trace artifacts on failure
2. ✅ `BUNDLER: ${{ vars.DEFAULT_BUNDLER || 'app-vite' }}` (single bundler, not a matrix)
3. ⬜ Optional: add to `pnpm quality-checks` once stable

**Verification:**

```bash
# Local dry-run of CI steps
pnpm build:app && pnpm preview:app & … && pnpm e2e
```

---

### Phase 3 — Docs + agent alignment ✅ DONE

**Goal:** Template adopters understand the two-lane model.

1. ✅ **AGENTS.md** — validation map (unit / E2E / smoke / agent verify / capture)
2. ✅ **`docs/component-validation-contract.md`** — Playwright E2E as registry consumer; Verification section
3. ✅ **`docs/e2e.md`** — local workflow, bundler override, locator conventions
4. ✅ **README.md** — `pnpm e2e` in test section
5. ✅ **browser-validation skill** — regression → Playwright; live dev → browser snapshot
6. ✅ Run `pnpm sync:agents`

**Verification:**

```bash
pnpm check:agents
pnpm check:links
```

---

### Phase 4 — Smoke workflow consolidation ✅ DONE (Option A)

**Goal:** Remove duplicate assertions; keep smoke focused.

- ✅ **Option A:** Region assertions in Playwright E2E; smoke keeps dev-server boot + HTTP 200 only
- Removed Chrome setup, `browser validate`, and capture-on-failure from `verify-browser-smoke.yml`
- Docs aligned: `docs/e2e.md`, `docs/browser-validation.md`, `docs/component-validation-contract.md`

---

## First test scope (v1 — do not overbuild)

| Test           | Assertion                                    |
| -------------- | -------------------------------------------- |
| App loads      | `main` or root visible, no 5xx               |
| Header region  | `getByTestId('app-header')` visible          |
| Resource cards | `getByTestId('resource-cards')` visible      |
| Scroller       | `getByTestId('scroller')` visible            |
| Console clean  | No `console.error` on load (optional strict) |

**Out of scope v1:** auth, API mocking, cross-browser, Storybook E2E, visual regression (Chromatic), full user flows.

---

## Quality gate (every phase)

```bash
pnpm lint
pnpm test
pnpm check:type
pnpm check:agents   # when .rulesync/** changed
pnpm e2e       # when e2e package changed
```

---

## Optional follow-ups (out of scope unless requested)

- E2E failure → `browser-capture record-trace` in CI
- Playwright matrix across `app-vite`, `app-webpack`, `app-esbuild`
- Chromatic / visual regression on Storybook
- `@repo/browser-tools` MCP server (separate plan)
- Playwright component tests (usually redundant with Storybook + unit tests here)

## Completed follow-ups

- ✅ `@playwright/test` fixture that reuses `dev-tools-app-target` programmatically (`fixtures/app-target.ts`, `lib/resolve-preview-target.ts`)
- ✅ Page Object Model layer (`pages/app.page.ts`); add new page classes as specs grow

---

## Reference links (in repo)

| Doc                                                                                              | Purpose                      |
| ------------------------------------------------------------------------------------------------ | ---------------------------- |
| [`AGENTS.md`](../../AGENTS.md)                                                                   | Commands, quality loop       |
| [`docs/component-validation-contract.md`](../../docs/component-validation-contract.md)           | `data-testid` registry       |
| [`docs/browser-validation.md`](../../docs/browser-validation.md)                                 | Agent verify, URL derivation |
| [`.github/workflows/verify-browser-smoke.yml`](../../.github/workflows/verify-browser-smoke.yml) | Current smoke                |
| [`.github/workflows/verify-browser-perf.yml`](../../.github/workflows/verify-browser-perf.yml)   | Preview bootstrap pattern    |
| [`.ai/plans/capture-ci-integration.md`](./capture-ci-integration.md)                             | E2E failure capture idea     |
| [`packages/dev-tools/config/app-port.ts`](../../packages/dev-tools/config/app-port.ts)           | Port/URL source of truth     |
