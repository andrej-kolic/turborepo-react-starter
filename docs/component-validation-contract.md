# Component Validation Contract

Rules for adding agent-checkable identifiers to components in this monorepo.

---

## Scope

This contract governs **external verification of page regions** — assertions run by
`pnpm browser validate` and Playwright E2E (`pnpm e2e`).

It does **not** govern unit or integration test selectors. For those, follow the
[Playwright / Testing Library best practices](https://playwright.dev/docs/best-practices):
use role-based locators (`getByRole`, `getByLabel`, `getByText`) first, and treat `data-testid`
as a last resort.

The inversion here is intentional: for region anchors used by external tooling (agents, CI),
`data-testid` provides a stable machine-readable handle that survives text and style changes.

---

## Selector Hierarchy (agent verification)

| Priority | Selector                   | When to use                                                         |
| -------- | -------------------------- | ------------------------------------------------------------------- |
| 1st      | `data-testid` (kebab-case) | Any top-level page region an agent should assert on                 |
| 2nd      | `aria-label`               | When a testid is not present and the element has an accessible name |
| 3rd      | CSS class                  | Last resort — documented as less stable, breaks on renames          |

---

## Semantic HTML alongside testids

Prefer landmark elements wherever applicable. They provide ARIA roles for free, improve
accessibility, and let role-based selectors (unit tests, screen readers) target the same
element without additional attributes.

| Component       | Element                    | Implicit ARIA role |
| --------------- | -------------------------- | ------------------ |
| `Header`        | `<header>`                 | `banner`           |
| `ResourceCards` | `<section aria-label="…">` | `region`           |
| `AppCore`       | `<main>`                   | `main`             |

Always combine the semantic element with `data-testid` when the region needs external validation:

```tsx
<header className="Header" data-testid="app-header">
<section className="ResourceCards" aria-label="Resources" data-testid="resource-cards">
```

---

## Which Components Get a testid

Add `data-testid` to a component when **all** of the following are true:

1. It is a **top-level, user-visible page region** — a distinct area that an external validator
   (agent, CI smoke test) should independently confirm is rendered.
2. It is **not** a sub-element within an already-identifiable region.
3. It is **not** a reusable `@repo/ui` primitive — those are covered by role/label/text locators
   in unit tests; testids belong at the `app-core` integration layer.

Sub-elements within a region do not get testids unless they are independently verifiable features
(e.g., an expandable panel that a smoke test must assert opens correctly).

### Current registry

| `data-testid` value | Component                           | File                                                       |
| ------------------- | ----------------------------------- | ---------------------------------------------------------- |
| `app-header`        | `Header`                            | `packages/app-core/src/components/Header/index.tsx`        |
| `resource-cards`    | `ResourceCards`                     | `packages/app-core/src/components/ResourceCards/index.tsx` |
| `scroller`          | `Scroller` (via `DynamicList` prop) | `packages/app-core/src/components/Scroller/index.tsx`      |

---

## Naming Convention

- **Format:** kebab-case
- **Scope:** unique within a rendered page — not globally unique across packages
- **Examples:** `app-header`, `resource-cards`, `scroller`
- **Avoid:** package-namespaced IDs (`app-core-header`) — unnecessary for a single-page app

---

## Production Builds

`data-testid` attributes are **intentionally present in production builds**. This project is a
public frontend starter. The attributes carry no security risk and allow agents and Playwright E2E
to run assertions against deployed URLs without a separate build configuration.

If this project were to ship as a library or a security-sensitive product, testids should be
stripped via a Babel plugin or custom bundler transform.

---

## Registry consumers

| Consumer                 | Target        | Command / workflow                                                                                                 |
| ------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| Agent CLI                | Dev server    | `pnpm browser validate --selector "[data-testid=…]"`                                                               |
| Playwright E2E           | Preview build | `pnpm e2e` — see [`docs/e2e.md`](e2e.md)                                                                           |
| CI smoke (all bundlers)  | Dev server    | HTTP 200 boot only — [`.github/workflows/verify-browser-smoke.yml`](../.github/workflows/verify-browser-smoke.yml) |
| CI E2E (default bundler) | Preview build | [`.github/workflows/verify-e2e.yml`](../.github/workflows/verify-e2e.yml) — `vars.DEFAULT_BUNDLER`                 |

## Verification

**Agent (dev server):** run against the URL from `pnpm browser:ensure-app`. See
[`docs/browser-validation.md`](browser-validation.md) for URL setup.

**Smoke (dev server, all bundlers):** boot + HTTP 200 only — no region assertions. See
[`verify-browser-smoke.yml`](../.github/workflows/verify-browser-smoke.yml).

**E2E (preview build):**

```bash
pnpm build:app
pnpm preview:app &
pnpm e2e
```

Override the bundler with `BUNDLER=app-webpack` (or `app-esbuild`) before build/preview/test.
Set `TARGET_URL` to point at an already-running preview. CI uses `vars.DEFAULT_BUNDLER` (fallback
`app-vite`) via [`.github/workflows/verify-e2e.yml`](../.github/workflows/verify-e2e.yml).

---

## @repo/ui Components

`packages/ui` primitives are **not** assigned `data-testid` values directly. They expose a
`data-testid` prop where needed so the consuming `app-core` component can inject the correct
value at the integration layer.

Current UI components with prop support:

| Component     | Prop                   | Forwarded to                    |
| ------------- | ---------------------- | ------------------------------- |
| `DynamicList` | `data-testid?: string` | `<div className="DynamicList">` |
