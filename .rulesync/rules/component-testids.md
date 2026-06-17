---
root: false
targets:
  - cursor
description: data-testid and semantic HTML for agent-checkable page regions
globs:
  - packages/app-core/**/*.tsx
  - packages/ui/**/*.tsx
cursor:
  alwaysApply: false
  description: data-testid and semantic HTML for agent-checkable page regions
  globs:
    - packages/app-core/**/*.tsx
    - packages/ui/**/*.tsx
---

# Component validation contract

Governs **agent CLI verification** (`pnpm browser validate`, CI smoke) — not unit-test selectors.
Full spec: [`docs/component-validation-contract.md`](../../docs/component-validation-contract.md)

## Selector priority (agent verification)

1. `data-testid` (kebab-case) — top-level page regions agents assert on
2. `aria-label` — when no testid
3. Role + accessible name — e.g. `[role=button][aria-label=…]`
4. CSS class — last resort

## When adding a testid

- Top-level, user-visible **page regions** only (e.g. `app-header`, `resource-cards`)
- Prefer landmark elements: `<header>`, `<section>`, `<main>` for free ARIA roles
- `data-testid` stays in production builds (intentional for agents and smoke tests)
- **Storybook** covers `packages/ui` only; `app-core` is verified against the live app

## Unit / integration tests

Use role-based locators (`getByRole`, `getByLabel`) per Testing Library / Playwright best practices.
`data-testid` is last resort there — inverted from the agent contract above.
