# Plan: Refactor `@repo/browser-capture` + shared CDP (Option A)

**Status:** Approved — ready to execute  
**Branch:** `develop`  
**Created:** 2026-06-20

## How to run (new chat)

Attach or `@`-mention this file — no need to paste instructions separately.

**Minimal prompt:**

```text
Execute .ai/plans/browser-capture-refactor.md — start at Phase 1.
```

**Full agent instructions** (also at top so the file is self-contained):

```text
Implement this plan. Read AGENTS.md first.

- Turborepo monorepo, branch develop.
- Approved: Option A (shared CDP in @repo/browser-tools), rename binary to browser-capture,
  add --attach to capture, root pnpm capture:* scripts, MCP via .rulesync/mcp.json + pnpm sync:agents.
- Do NOT replace packages with external npm tools.
- Execute phase-by-phase; run pnpm lint, pnpm test, pnpm check:type after each phase.
- Start with Phase 1 unless I specify a different phase.

If the plan is already partially done, read git status and skip completed tasks.
```

---

## Executive summary

Split the ~1,737-line monolith `packages/browser-capture/bin/copilot-devtools.js` into a modular `src/` layout (mirroring `@repo/browser-tools`), share CDP primitives via **Option A** (extend `@repo/browser-tools` exports), rename the CLI binary to `browser-capture`, add **`--attach`** to capture commands that navigate, add root **`pnpm capture:*`** scripts, and update MCP via **`.rulesync/mcp.json`** (then `pnpm sync:agents`).

**Do not replace these packages with external npm tools.** They are repo-specific orchestration (artifact layout, sanitization policy, CI, APP_URL wiring, agent skills). External tools already in use: `playwright-core`, `chrome-devtools-mcp` (verify MCP tier).

---

## Decisions (locked in)

| #   | Decision                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Option A** — shared CDP lives in `@repo/browser-tools`; `@repo/browser-capture` depends on it                                   |
| 2   | **Rename binary** — `copilot-devtools` → `browser-capture`                                                                        |
| 3   | **Add `--attach`** — capture commands that navigate can reuse the visible tab (same semantics as `browser-tools --attach`)        |
| 4   | **Root scripts** — add `pnpm capture:*` wrappers (parallel to `pnpm browser:*`)                                                   |
| 5   | **MCP config** — edit `.rulesync/mcp.json` only; run `pnpm sync:agents`; do not hand-edit `.cursor/mcp.json` / `.vscode/mcp.json` |
| 6   | **Keep internal** — do not publish to npm; do not adopt `@playwright/mcp` as a third MCP server                                   |

---

## Current state

### `@repo/browser-tools` (reference architecture)

```
packages/browser-tools/
  bin/browser.js          # thin CLI router
  bin/chrome.js           # Chrome lifecycle
  bin/setup.js            # ensure Chrome + tab
  src/cli/args.js         # parseArgs (unit tested)
  src/cli/bin-names.js
  src/cdp/connect.js      # connectOverCDP
  src/cdp/session.js      # withPageSession, withAttachedSession
  src/cdp/tabs.js         # openUrl, findPageAtOrigin
  src/chrome/lifecycle.js
  src/cdp/assert.js, read.js, snapshot/
```

### `@repo/browser-capture` (today)

```
packages/browser-capture/
  bin/copilot-devtools.js   # ~1,737 lines — CLI + MCP + all logic
  package.json              # bin: copilot-devtools
  README.md, SECURITY.md, CHANGELOG.md
  artifacts/                # gitignored output
```

**No tests.** No `src/`. No workspace dependency on `@repo/browser-tools`.

### Tier model (do not break)

| Tier    | Package / tool                                  | Use for                                    |
| ------- | ----------------------------------------------- | ------------------------------------------ |
| Verify  | `@repo/browser-tools`, `chrome-devtools` MCP    | DOM assertions — no capture artifacts      |
| Capture | `@repo/browser-capture`, `devtools-capture` MCP | HAR, traces, Web Vitals, console artifacts |

---

## Target architecture

```mermaid
flowchart TB
  subgraph tools ["@repo/browser-tools"]
    BT_BIN[browser-tools CLI]
    BT_CDP[cdp exports: connect, http, pages, console, session]
    BT_CHROME[chrome lifecycle]
  end

  subgraph capture ["@repo/browser-capture"]
    BC_BIN[browser-capture CLI]
    BC_MCP[MCP server]
    BC_CAP[capture/* recorders]
    BC_SAN[sanitize/*]
    BC_ART[artifacts/*]
  end

  BC_BIN --> BC_CAP
  BC_MCP --> BC_CAP
  BC_CAP --> BT_CDP
  BC_CAP --> BC_SAN
  BC_CAP --> BC_ART
  BT_BIN --> BT_CDP
```

### Target file layout — `browser-capture`

```
packages/browser-capture/
  bin/browser-capture.js          # thin router (~80 lines)
  src/
    cli/
      args.js                     # resolveDurationMs, requireUrl, captureOptions (--attach, --no-sanitize)
      usage.js
    capture/
      snapshot.js
      trace.js
      performance.js
      console.js
      interactions.js
    inject/
      performance-observer.js     # PERFORMANCE_OBSERVER_SOURCE string
      interaction-recorder.js     # INTERACTION_RECORDER_SOURCE string
    performance/
      metrics.js                  # getPerformanceMetrics
    interactions/
      source-map.js               # resolveSourceLocation
      locator.js                  # interactionToLocator
      test-generator.js           # generatePlaywrightTest
    artifacts/
      paths.js                    # ensureArtifactsDirectory, timestamps
      metadata.js                 # buildMetadata, git helpers
      write.js                    # writeJson
      upload.js
    sanitize/
      index.js
      har.js
      console.js
      interactions.js
      redact.js
    mcp/
      server.js
      tools.js
  __tests__/
    sanitize.test.js
    args.test.js
    locator.test.js
    test-generator.test.js
  vitest.config.ts
```

### Target exports — `browser-tools` (Option A)

Add to `packages/browser-tools/package.json`:

```json
{
  "exports": {
    "./cdp": "./src/cdp/index.js",
    "./cli/args": "./src/cli/args.js"
  }
}
```

Extend `src/cdp/index.js` (or add modules) with:

| Module       | Purpose                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `connect.js` | Already exists — `connectOverCDP(port?, host?)`                                                                                |
| `http.js`    | **New** — `fetchCdpJson(path)` for `/json/version`, `/json/list` (use `fetch`, match `lifecycle.js` pattern)                   |
| `pages.js`   | **New** — `findPageAtOrigin(browser, url)` (move from `tabs.js`), `findRecentPage(browser)` (from capture's `getExistingPage`) |
| `console.js` | **New** — `attachConsoleListeners(page, { mode: 'errors' \| 'full' })`                                                         |
| `session.js` | Existing — `withPageSession`, `withAttachedSession`                                                                            |

Refactor `session.js` to use shared `console.js` internally (behavior unchanged).

Env resolution: export constants or helper for `CHROME_DEBUG_PORT` (default 9222) and `CHROME_DEBUG_HOST` (default `localhost`).

---

## Phased execution

Execute as **separate PRs** when possible. Each phase ends with quality gate.

### Phase 1 — Decompose monolith (no shared deps yet)

**Goal:** Same behavior, modular files, unit tests. Binary name can stay `copilot-devtools` temporarily to reduce diff noise, or rename in Phase 3 only — **prefer rename in Phase 3** so Phase 1 is pure refactor.

**Tasks:**

1. Create `src/` tree; move functions from `bin/copilot-devtools.js` into modules (preserve behavior exactly).
2. Leave `bin/copilot-devtools.js` as thin import + dispatch (or rename stub that re-exports).
3. Add `vitest.config.ts` + `__tests__/` for pure functions:
   - `sanitize/*` — header allowlist, PII redaction, sensitive field names
   - `cli/args.js` — `resolveDurationMs` validation
   - `interactions/locator.js` — locator priority chain
   - `interactions/test-generator.js` — snapshot output shape
4. Add to `packages/browser-capture/package.json`:
   ```json
   "scripts": {
     "test": "vitest run",
     "test:watch": "vitest"
   },
   "devDependencies": {
     "vitest": "catalog:"
   }
   ```
5. MCP server name/version strings stay functional; update only if moving files breaks paths.

**Verification:**

```bash
pnpm --filter @repo/browser-capture test
pnpm chrome:debug   # required_permissions: all
node packages/browser-capture/bin/copilot-devtools.js capture-snapshot
node packages/browser-capture/bin/copilot-devtools.js record-trace "$(pnpm exec dev-tools-app-target url)" --duration 3
```

Compare artifact structure under `packages/browser-capture/artifacts/` to pre-refactor (same filenames: `metadata.json`, `har.json`, `trace.zip`, etc.).

---

### Phase 2 — Shared CDP in `@repo/browser-tools`

**Goal:** Remove duplication; capture imports from tools.

**Tasks:**

1. Add `src/cdp/http.js`, `pages.js`, `console.js`.
2. Update `src/cdp/index.js` exports.
3. Add `exports` field to `browser-tools/package.json`.
4. Refactor `browser-tools` internals to use new modules (no CLI behavior change).
5. Add `@repo/browser-tools: workspace:*` to `browser-capture/package.json`.
6. Replace in capture:
   - local `parseArgs` → `import { parseArgs } from '@repo/browser-tools/cli/args'`
   - local `connectCDP` → `import { connectOverCDP, fetchCdpJson, ... } from '@repo/browser-tools/cdp'`
   - local `httpGetJson` → `fetchCdpJson`
   - local `getExistingPage` → `findRecentPage`
7. Add unit tests in `browser-tools` for `http.js` and `pages.js` (mock fetch / minimal fixtures).
8. Remove duplicate code from capture.

**Verification:**

```bash
pnpm --filter @repo/browser-tools test
pnpm --filter @repo/browser-capture test
pnpm lint && pnpm test && pnpm check:type
# Re-run capture CLI smoke commands from Phase 1
pnpm --filter @repo/browser-tools test  # existing args tests still pass
```

---

### Phase 3 — Rename binary + MCP (rulesync)

**Goal:** `browser-capture` binary; MCP points to new path.

**Tasks:**

1. Rename `bin/copilot-devtools.js` → `bin/browser-capture.js`.
2. Update `packages/browser-capture/package.json`:
   ```json
   "bin": {
     "browser-capture": "./bin/browser-capture.js"
   }
   ```
3. Update `.rulesync/mcp.json`:
   ```json
   "devtools-capture": {
     "command": "node",
     "args": [
       "packages/browser-capture/bin/browser-capture.js",
       "mcp-server"
     ],
     "env": { "CHROME_DEBUG_PORT": "9222" }
   }
   ```
4. Run `pnpm sync:agents` and commit generated `.cursor/mcp.json`, `.vscode/mcp.json`, etc.
5. Update strings: MCP server `name` can stay `copilot-devtools` or become `browser-capture` (pick one; prefer **`browser-capture`** for consistency).
6. Update generated test file header: `// Generated by browser-capture record-interactions`.
7. Grep repo for `copilot-devtools` and update all references (list below).

**Files to update (grep `copilot-devtools`):**

- `packages/browser-capture/README.md`
- `packages/browser-capture/CHANGELOG.md`
- `packages/browser-capture/SECURITY.md`
- `.rulesync/skills/x-browser-capture/SKILL.md`
- `.github/workflows/capture-devtools.yml`
- `.github/workflows/verify-browser-smoke.yml`
- `.github/workflows/verify-browser-perf.yml`
- `.rulesync/rules/copilot-instructions.md` (if path mentioned)
- `.ai/plans/capture-ci-integration.md` (optional — historical plan)

**Verification:**

```bash
pnpm check:agents
pnpm sync:agents   # should be clean after commit
# Restart MCP / confirm devtools-capture server starts
node packages/browser-capture/bin/browser-capture.js mcp-server  # stdio — Ctrl+C after "started"
```

---

### Phase 4 — `--attach` for capture

**Goal:** Navigate-based capture commands can attach to the visible tab (preserve auth/session).

**Commands to support `--attach`:**

| Command               | Default today                     | With `--attach`                                                                                        |
| --------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `record-trace`        | `browser.newContext()` + navigate | `withAttachedSession` — **do not navigate**; record on current page OR navigate only if explicit flag? |
| `record-performance`  | new context + navigate            | same                                                                                                   |
| `record-interactions` | new context + navigate            | same                                                                                                   |
| `record-console`      | already uses existing tab         | `--attach` optional/no-op or match by origin                                                           |
| `capture-snapshot`    | HTTP only                         | N/A                                                                                                    |

**Align with browser-tools semantics** (from `packages/browser-tools/README.md`):

- `--attach` matches tab by **origin** of URL
- Does **not** navigate — inspects/records current page
- Error hint: run `browser-tools open --url <url>` first

**Implementation:**

1. Add `--attach` to capture CLI args (`src/cli/args.js` → `captureOptions()`).
2. For `record-trace`, `record-performance`, `record-interactions`:
   - **Without `--attach`:** keep current isolated `newContext()` behavior (CI-friendly).
   - **With `--attach`:** use `withAttachedSession(url, fn)` from `@repo/browser-tools/cdp`; skip `page.goto` when attaching; still run duration wait + artifact write.
3. Document in `packages/browser-capture/README.md`.
4. MCP tools: add optional `attach: boolean` to zod schemas where relevant (default `false`).
5. Update `.rulesync/skills/x-browser-capture/SKILL.md` + `pnpm sync:agents`.

**Edge cases:**

- HAR/trace on attach: use existing context's page; tracing/HAR may need context from attached page's browser context — test manually with authenticated tab.
- If attach + URL origin mismatch → same error as browser-tools.

**Verification:**

```bash
pnpm browser:setup
pnpm browser open --url "$(pnpm exec dev-tools-app-target url)"
pnpm browser-capture record-console --attach --duration 3   # after root scripts exist
# Or: node packages/browser-capture/bin/browser-capture.js record-performance URL --attach --duration 3
```

---

### Phase 5 — Root `pnpm capture:*` scripts

**Goal:** Mirror `pnpm browser:*` ergonomics with APP_URL injection.

**Add to root `package.json`:**

```json
{
  "devDependencies": {
    "@repo/browser-capture": "workspace:*"
  },
  "scripts": {
    "capture:snapshot": "dotenv -- dev-tools-app-target run browser-capture capture-snapshot",
    "capture:trace": "dotenv -- dev-tools-app-target run browser-capture record-trace",
    "capture:performance": "dotenv -- dev-tools-app-target run browser-capture record-performance",
    "capture:console": "dotenv -- dev-tools-app-target run browser-capture record-console",
    "capture:interactions": "dotenv -- dev-tools-app-target run browser-capture record-interactions",
    "capture:upload": "dotenv -- browser-capture upload-artifacts"
  }
}
```

**Notes:**

- `record-*` commands need URL — either pass as extra args (`pnpm capture:trace -- http://localhost:5173`) or teach CLI to use `APP_URL` when URL positional omitted (align with browser-tools `resolveUrl`).
- Consider extending capture CLI: if URL positional missing, use `process.env.APP_URL` then `CAPTURE_URL` (document precedence).
- Update `AGENTS.md`, root `README.md`, capture skill, `packages/browser-capture/README.md`.

**Verification:**

```bash
pnpm browser:ensure-app
pnpm chrome:debug
pnpm capture:snapshot
pnpm capture:trace -- "$(pnpm exec dev-tools-app-target url)" --duration 3
```

---

## Quality gate (every phase)

From `AGENTS.md` / workspace rules:

```bash
pnpm lint
pnpm test
pnpm check:type
pnpm check:agents   # when .rulesync/** changed
```

For capture changes specifically:

```bash
pnpm --filter @repo/browser-capture test
pnpm --filter @repo/browser-tools test
```

---

## Behavior that must NOT change

1. **Artifact paths:** `packages/browser-capture/artifacts/<mode>-<timestamp>/`
2. **Artifact filenames:** `metadata.json`, `har.json`, `trace.zip`, `console.json`, `performance.json`, `interactions.json`, `generated.test.ts`
3. **Automatic sanitization** before write (unless `--no-sanitize`)
4. **`SECURITY.md` policy** — allowlist + PII patterns unchanged unless explicitly requested
5. **MCP tool names:** `capture_snapshot`, `record_trace`, `record_performance`, `record_console`, `record_interactions`, `sanitize_artifacts` (snake_case)
6. **Verify vs capture tier separation** in skills and docs
7. **CI workflows** must keep working (update paths only)

---

## Optional follow-ups (out of scope unless requested)

- Replace `chrome/lifecycle.js` with `chrome-launcher` npm package
- Use `pw-sanitizer` for trace zip post-processing (partial overlap only)
- Add `@repo/browser-tools` MCP server (README TODO)
- `browser-tools check-spec` command

---

## Reference links (in repo)

| Doc                                              | Purpose                         |
| ------------------------------------------------ | ------------------------------- |
| `AGENTS.md`                                      | Commands, Node 24, quality loop |
| `packages/browser-tools/README.md`               | `--attach`, CLI flags           |
| `packages/browser-capture/README.md`             | Capture commands, artifacts     |
| `packages/browser-capture/SECURITY.md`           | Sanitization contract           |
| `.rulesync/skills/x-browser-capture/SKILL.md`    | Agent capture workflow          |
| `.rulesync/skills/x-browser-validation/SKILL.md` | Verify tier (do not mix)        |
| `docs/browser-validation.md`                     | URL derivation, edge cases      |
| `.github/workflows/capture-devtools.yml`         | CI capture                      |
| `.github/workflows/verify-browser-smoke.yml`     | Smoke + optional trace          |
