# Browser Tools — Implementation Plan

Refactor browser verification and capture in `turborepo-react-starter`. Separates two previously
conflated concerns into clean, separately-named packages with clear agent instructions.

---

## Core Principle: verify vs capture

| Concept     | Industry terms                             | Role                                   | Artifacts | Tools                                          |
| ----------- | ------------------------------------------ | -------------------------------------- | --------- | ---------------------------------------------- |
| **Verify**  | drive + verify, live UI checks, assertions | Read DOM, assert text, check selector  | None      | `chrome-devtools` MCP, `pnpm browser:validate` |
| **Capture** | instrumentation, tracing, DevTools capture | HAR, traces, Web Vitals, console dumps | Yes (CI)  | `@repo/browser-capture`, `pnpm automation:*`   |

> Never use capture tools for routine verification. Never use verify tools when a CI artifact is
> needed.

---

## Agent Decision Model

Pick the lightest path that answers the question. Work top to bottom and stop at the first row
that fits.

| Goal                                                     | Use                                                                         | Avoid                                |
| -------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------ |
| Component logic, hooks, pure functions                   | `pnpm test` (Vitest + RTL)                                                  | Any browser process                  |
| Component UI in isolation                                | `pnpm dev:ui` → Storybook `http://localhost:6006`                           | Full app unless integration matters  |
| Assert text / DOM / selector (MCP available)             | `chrome-devtools` MCP — `navigate_page`, `evaluate_script`, `take_snapshot` | `record_trace`, `record_performance` |
| Assert text / DOM / selector (no MCP — Cloud Agent, SSH) | `pnpm browser:validate --selector … --contains …`                           | Raw one-off Playwright scripts       |
| Record HAR, network, Web Vitals, trace for debugging     | `@repo/browser-capture` `record-trace` / `record-performance`               | `chrome-devtools` MCP (wrong tier)   |
| CI artifact, PR comment workflow                         | `@repo/browser-capture` + `.github/workflows/devtools.yml`                  | MCP (not available in CI)            |

---

## Architecture: Current → Target

```
CURRENT                                    TARGET

scripts/                                   packages/browser-tools/       (new)
  chrome-debug.js  ← outgrown scripts/       bin/chrome-debug.js         ← moved
                                              bin/browser-verify.js       ← new
packages/automation/                          src/chrome/lifecycle.js     ← extracted
  bin/copilot-devtools.js  ← capture +      src/cdp/connect.js          ← new
                             verify mixed    src/cdp/verify.js           ← new

                                           packages/browser-capture/     (renamed from automation/)
                                             bin/copilot-devtools.js     ← unchanged
                                             (capture/instrumentation only)

.cursor/mcp.json                           .cursor/mcp.json
  "chrome-devtools": …@latest               "chrome-devtools": …@1.x.x  ← pinned
  "automation": …                           "devtools-capture": …        ← renamed key
```

---

## What NOT To Do

- Do not remove either MCP server — `chrome-devtools` and `devtools-capture` serve different tiers.
- Do not make `record_trace` the default in skills or examples for DOM checks. Traces are for
  debugging failures, not for reading text.
- Do not merge `browser-tools` and `browser-capture` — that blurs the one naming fix that
  eliminates agent confusion. Verify and capture have diverging connection patterns and dependency
  reasons even when both use `playwright-core`.
- Do not add `@playwright/test` to `pnpm test` (the main loop). Playwright Test runner (full E2E
  framework with `test()`, `expect()`, browser binaries) belongs in a separate optional workflow.
  `playwright-core` (low-level CDP library, already used) is fine in both packages.
- Do not scatter browser instructions across multiple files without a single canonical entry point
  — agent confusion is caused by this today.

---

## Breaking Change Notes

### MCP server key rename: `"automation"` → `"devtools-capture"`

The rename changes the config key in `.cursor/mcp.json` **only**. The MCP tool names exposed by
the server (`record_trace`, `record_performance`, etc.) do **not** change — they are defined by
the server itself, not the key.

However, any text that references the server by its config key name must be updated atomically in
the same commit:

- [ ] `AGENTS.md` — any mention of `automation` MCP server by key name
- [ ] `.github/copilot-instructions.md` — same
- [ ] `skills/` files — any skill that names the `automation` MCP server
- [ ] `packages/automation/README.md` (the file that becomes `browser-capture/README.md`)
- [ ] `.vscode/mcp.json` — if it exists, must stay in sync with `.cursor/mcp.json`

### Package rename: `@repo/automation` → `@repo/browser-capture`

The package is `private: true` and is not imported by any other package as a dependency. The only
references are path-based (root scripts use `node packages/automation/bin/…`, turbo uses
`--filter @repo/automation`). Update all of these in the same commit:

- [ ] Root `package.json` scripts
- [ ] `turbo.json` if it names the package directly
- [ ] Any `--filter @repo/automation` in CI workflows
- [ ] Directory rename: `packages/automation/` → `packages/browser-capture/`

---

## Phase 1 — Documentation, Config & Agent Skill

**Priority:** High · **Effort:** Low · **No code changes**

Biggest clarity win. All doc and config changes; nothing that can break the dev workflow.

### Tasks

- [ ] Create `docs/browser-validation.md` — Mermaid decision flowchart, verify-vs-capture rule
      table, three environment scenarios (local, remote deploy, SSH tunnel with port-forward
      instructions)
- [ ] Create `skills/browser-validation/SKILL.md` — agent entry point that reads first; references
      `docs/browser-validation.md` for full detail
- [ ] Update `AGENTS.md` — add "Browser validation" section: link to
      `skills/browser-validation/SKILL.md`, embed the light/heavy rule table, add Cloud Agent note
      (`pnpm browser:validate` when MCP unavailable)
- [ ] Update `.env.example` — add `CHROME_DEBUG_HOST`, `CHROME_DEBUG_PORT`, `CHROME_HEADLESS`
      with inline comments; document optional `APP_URL` (CI/deployed override, Phase 2b) — do not
      add bundler-specific URL vars; app URL derives from `BUNDLER` port table
- [ ] Pin `chrome-devtools-mcp` to a fixed version in `.cursor/mcp.json` (look up current stable,
      remove `@latest`)
- [ ] Rename MCP server key `"automation"` → `"devtools-capture"` in `.cursor/mcp.json` — see
      Breaking Change Notes above for all files to update atomically
- [ ] Fix wrong port in any existing skill or example files (`localhost:3000` → bundler port, or
      explicit `--url` with port from `BUNDLER` table)

### Verification checkpoint

```bash
# MCP config is valid JSON and both servers still appear
node -e "const c = JSON.parse(require('fs').readFileSync('.cursor/mcp.json','utf8')); console.log(Object.keys(c.mcpServers))"
# Expected: [ 'chrome-devtools', 'devtools-capture' ]

# Dev workflow unchanged
pnpm dev:app  # should still start on port 5173
```

---

## Phase 2a — Package Shell + Move chrome-debug.js

**Priority:** High · **Effort:** Low · **Depends on:** Phase 1 complete

Zero new functionality. Restructuring only. Fully verifiable — `pnpm chrome:debug` must behave
identically after this phase.

### Tasks

- [ ] Create `packages/browser-tools/package.json`:
  ```json
  {
    "name": "@repo/browser-tools",
    "private": true,
    "version": "0.0.0",
    "type": "module"
  }
  ```
- [ ] Create `packages/browser-tools/README.md` — "Chrome lifecycle + UI verification"
- [ ] Move `scripts/chrome-debug.js` → `packages/browser-tools/bin/chrome-debug.js` (content
      unchanged)
- [ ] Add `playwright-core` to the workspace catalog in `pnpm-workspace.yaml` at the version
      already pinned in `packages/automation/package.json` (`1.44.0`). This prevents version drift
      when `browser-tools` adds it as a dependency in Phase 2b.
- [ ] Update root `package.json` `chrome:debug*` scripts to point at the new path:
  ```json
  "chrome:debug":        "node packages/browser-tools/bin/chrome-debug.js",
  "chrome:debug:status": "node packages/browser-tools/bin/chrome-debug.js --status",
  "chrome:debug:stop":   "node packages/browser-tools/bin/chrome-debug.js --stop"
  ```

### Verification checkpoint

```bash
pnpm chrome:debug --status   # should report Chrome running or not found (unchanged behaviour)
pnpm chrome:debug            # start Chrome
pnpm chrome:debug:status     # confirm running
pnpm chrome:debug:stop       # stop
pnpm chrome:debug:status     # confirm stopped
```

---

## Phase 2b — New Verify CLI

**Priority:** High · **Effort:** Medium · **Depends on:** Phase 2a complete

Adds the lightweight browser:validate / browser:read surface. Uses `playwright-core` over CDP —
no HAR, no trace, no artifacts.

> **Agent context (read before implementing):** Use `packages/automation/bin/copilot-devtools.js`
> as the reference implementation for how CDP connections are handled in this repo. Pay attention
> to how it calls `connectOverCDP`, how it manages the browser/page lifecycle, and how it handles
> connection errors. The new verify code must follow the same patterns — a divergence here (e.g.
> using a different connection method or managing sessions differently) will cause subtle failures
> when both packages are used against the same Chrome instance.

### Tasks

- [ ] Extract Chrome lifecycle core from `bin/chrome-debug.js` into
      `packages/browser-tools/src/chrome/lifecycle.js` — `start()`, `stop()`, `status()` functions
      importable without invoking the CLI
- [ ] Create `packages/browser-tools/src/cdp/connect.js` — fast stateless `connectOverCDP(port)`
      helper (no persistent session, disconnects after each call)
- [ ] Create `packages/browser-tools/src/cdp/verify.js` — `evaluateScript()`,
      `takeSnapshot()`, `assertSelectorExists()`, `assertTextVisible()` wrappers using the connect
      helper
- [ ] Add `playwright-core` dependency to `packages/browser-tools/package.json` (use catalog
      version pinned in Phase 2a)
- [ ] Create `packages/browser-tools/bin/browser-verify.js` — CLI with `--url`, `--selector`,
      `--contains`, `--json` flags; exits `1` on assertion failure, `0` on pass. When `--url` is
      omitted: resolve `APP_URL` env var, else derive `http://localhost:<port>` from `BUNDLER`
      (app-vite 5173, app-webpack 8080, app-esbuild 8000), else error with port table
- [ ] Update root `package.json` — add new scripts:
  ```json
  "browser:read":     "node packages/browser-tools/bin/browser-verify.js read",
  "browser:validate": "node packages/browser-tools/bin/browser-verify.js validate"
  ```
- [ ] Update `docs/browser-validation.md` and `skills/browser-validation/SKILL.md` with usage
      examples for both new commands

### Verification checkpoint

```bash
# Requires app running and Chrome on port 9222
pnpm dev:app &
pnpm chrome:debug

pnpm browser:validate --url http://localhost:5173 --selector body
# exit 0

pnpm browser:validate --url http://localhost:5173 --selector "[data-testid=nonexistent]"
# exit 1

pnpm browser:read --url http://localhost:5173 --selector body --json
# JSON output to stdout, exit 0
```

---

## Phase 3 — Component Validation Contract

**Priority:** Medium · **Effort:** Low · **Depends on:** Phase 2b (to run verify commands)

### Tasks

- [ ] Add `data-testid="app-header"` to the root element of
      `packages/app-core/src/components/Header/index.tsx`
- [ ] Add `data-testid="resource-cards"` to the root element of
      `packages/app-core/src/components/ResourceCards/index.tsx`
- [ ] Add `data-testid="scroller"` to the root element of
      `packages/app-core/src/components/Scroller/index.tsx`
- [ ] Create `docs/component-validation-contract.md`:
  - Prefer `data-testid` (kebab-case) on user-visible and agent-checkable regions
  - Prefer accessible name (`aria-label`) as second choice
  - CSS class selectors are last resort — documented as less stable
  - Storybook stories must use the same `data-testid` values as the app
- [ ] Verify Storybook stories for all three updated components expose the same `data-testid`

### Verification checkpoint

```bash
# Requires app running and Chrome on port 9222
pnpm browser:validate --url http://localhost:5173 --selector "[data-testid=app-header]"
pnpm browser:validate --url http://localhost:5173 --selector "[data-testid=resource-cards]"
pnpm browser:validate --url http://localhost:5173 --selector "[data-testid=scroller]"
# all three: exit 0
```

---

## Phase 4 — Rename automation → browser-capture

**Priority:** Medium · **Effort:** Low · **Depends on:** Phase 1 complete

See Breaking Change Notes above for the full atomicity checklist.

> **Agent context (read before implementing):** This phase has strict atomicity requirements.
> All files that reference the old names (`@repo/automation`, `packages/automation/`,
> `"automation"` MCP key) must be updated in a single commit — do not leave the repo in a state
> where some files use the old name and others the new one. Run `rg "automation"` from the repo
> root before starting to produce the full list of references, then work through every match
> before committing.

### Tasks

- [ ] Rename directory `packages/automation/` → `packages/browser-capture/`
- [ ] Update `packages/browser-capture/package.json` — change name to `@repo/browser-capture`
- [ ] Update `packages/browser-capture/README.md` — lead with "capture/instrumentation only — not
      for routine verification"; link to `docs/browser-validation.md` for the verify path
- [ ] Update root `package.json` scripts — replace `packages/automation/bin/…` paths with
      `packages/browser-capture/bin/…`
- [ ] Update `.cursor/mcp.json` `devtools-capture` server args to point at new path
- [ ] Update any `--filter @repo/automation` references in CI workflows and `turbo.json`
- [ ] Verify `zod@3.25.0` ships with `dist/` in the local environment; pin to a known-good version
      if the MCP server fails to start
- [ ] Check for `skills/chrome-devtools/SKILL.md` — if it exists, rename to
      `skills/browser-capture/SKILL.md` and update content to capture-only framing

### Verification checkpoint

```bash
# MCP server starts without errors
node packages/browser-capture/bin/copilot-devtools.js mcp-server &
# should print: MCP server running on stdio

# Existing capture commands still work
pnpm chrome:debug
node packages/browser-capture/bin/copilot-devtools.js capture-snapshot
# should produce artifacts/ output
```

---

## Phase 5 — CI & Storybook Alignment (Optional)

**Priority:** Low · **Effort:** Medium

**Hard dependencies:**

- Phase 2b must be complete (`pnpm browser:validate` must exist)
- Phase 3 must be complete (`data-testid=app-header` must exist)

### Tasks

- [ ] Add `APP_STORYBOOK_URL=http://localhost:6006` to `.env.example`
- [ ] Document Storybook validation path in `docs/browser-validation.md`:
      `pnpm dev:ui` → `http://localhost:6006/?path=/story/…`
- [ ] Add `pnpm browser:read` usage example against Storybook in the skill
- [ ] Create `.github/workflows/browser-smoke.yml`:
  ```yaml
  # Fast headless smoke test — separate from devtools.yml (artifact capture)
  # Validates app renders key components; not a replacement for unit tests.
  - run: pnpm chrome:debug # CHROME_HEADLESS=true
  - run: pnpm dev:app &
  - run: wait-on http://localhost:5173 # or derive port from BUNDLER matrix
  - run: pnpm browser:validate --url http://localhost:5173 --selector "[data-testid=app-header]" --contains "app-vite"
  ```

### Verification checkpoint

```bash
# Simulate CI locally
CHROME_HEADLESS=true pnpm chrome:debug
BUNDLER=app-vite pnpm dev:app &
pnpm browser:validate --url http://localhost:5173 --selector "[data-testid=app-header]"
# exit 0
```

---

## Key Files Reference

| File / Path                                     | Action                                                          |    Phase     |
| ----------------------------------------------- | --------------------------------------------------------------- | :----------: |
| `docs/browser-validation.md`                    | CREATE — decision tree, env table, 3 scenarios                  |      1       |
| `skills/browser-validation/SKILL.md`            | CREATE — agent entry point                                      |      1       |
| `AGENTS.md`                                     | UPDATE — add Browser validation section                         |      1       |
| `.env.example`                                  | UPDATE — add CHROME_DEBUG\*\*; optional APP_URL note (Phase 2b) |      1       |
| `.cursor/mcp.json`                              | UPDATE — pin version; rename key to devtools-capture            |      1       |
| `packages/browser-tools/`                       | CREATE — new @repo/browser-tools package                        |      2a      |
| `scripts/chrome-debug.js`                       | MOVE → `packages/browser-tools/bin/chrome-debug.js`             |      2a      |
| `pnpm-workspace.yaml`                           | UPDATE — add playwright-core to catalog                         |      2a      |
| `packages/browser-tools/bin/browser-verify.js`  | CREATE — verify CLI                                             |      2b      |
| `packages/browser-tools/src/cdp/verify.js`      | CREATE — CDP verify helpers                                     |      2b      |
| `package.json` (root)                           | UPDATE — chrome:debug\* paths + browser:read + browser:validate |   2a + 2b    |
| `packages/app-core/.../Header/index.tsx`        | UPDATE — add data-testid="app-header"                           |      3       |
| `packages/app-core/.../ResourceCards/index.tsx` | UPDATE — add data-testid="resource-cards"                       |      3       |
| `packages/app-core/.../Scroller/index.tsx`      | UPDATE — add data-testid="scroller"                             |      3       |
| `docs/component-validation-contract.md`         | CREATE — selector stability convention                          |      3       |
| `packages/automation/`                          | RENAME dir → `packages/browser-capture/`                        |      4       |
| `packages/browser-capture/package.json`         | UPDATE — name: @repo/browser-capture                            |      4       |
| `packages/browser-capture/README.md`            | UPDATE — capture-only framing                                   |      4       |
| `.github/workflows/browser-smoke.yml`           | CREATE — headless CI smoke test                                 | 5 (optional) |
