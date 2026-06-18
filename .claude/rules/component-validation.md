---
paths:
  - packages/app-core/**/*.tsx
  - packages/ui/**/*.tsx
---
# Component validation contract

Agent CLI verification (`pnpm browser validate`, CI smoke) — not unit-test selectors.
**Full spec:** [`docs/component-validation-contract.md`](../../docs/component-validation-contract.md)

Quick rules when editing components:

- Add `data-testid` (kebab-case) to top-level **page regions** only — not sub-elements or `@repo/ui` primitives
- Prefer landmark elements (`<header>`, `<section>`, `<main>`) alongside testids
- Unit/integration tests: role-based locators first; `data-testid` last (inverted from agent contract)
