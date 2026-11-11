# Component validation contract

Reference for the `data-testid` values that agents and Playwright E2E use to find page regions.

## Scope

This covers checks run from outside the app: `pnpm browser validate` and `pnpm e2e`. Unit and integration tests follow the [Playwright best practices](https://playwright.dev/docs/best-practices) instead: role-based locators (`getByRole`, `getByLabel`, `getByText`) first, `data-testid` last. External checks put `data-testid` first because it survives text and style changes.

## Selector order

| Priority | Selector                   | When                                               |
| -------- | -------------------------- | -------------------------------------------------- |
| 1st      | `data-testid` (kebab-case) | A top-level page region an agent or E2E asserts on |
| 2nd      | `aria-label`               | No testid, and the element has an accessible name  |
| 3rd      | CSS class                  | Last resort; breaks on renames                     |

## Which components get a testid

A component gets `data-testid` when all three hold:

1. It is a top-level, user-visible page region.
2. It is not a sub-element of a region that already has one, unless a test must check it on its own (e.g. a panel that must open).
3. It is not a `@repo/ui` primitive: unit tests find those by role. A primitive that needs one exposes a `data-testid` prop (like `DynamicList`), and the `app-core` component that uses it sets the value.

Pair the testid with a landmark element where one fits. The element gets an ARIA role for free, so unit tests and screen readers find the same region by role:

```tsx
<header className="Header" data-testid="app-header">
<section className="ResourceCards" aria-label="Resources" data-testid="resource-cards">
```

| Component       | Element                    | Implicit ARIA role |
| --------------- | -------------------------- | ------------------ |
| `Header`        | `<header>`                 | `banner`           |
| `ResourceCards` | `<section aria-label="…">` | `region`           |
| `AppCore`       | `<main>`                   | `main`             |

## Naming

Kebab-case, unique within a rendered page, no package prefix (`app-header`, not `app-core-header`).

## Registry

| `data-testid`    | Component                           | File                                                       |
| ---------------- | ----------------------------------- | ---------------------------------------------------------- |
| `app-header`     | `Header`                            | `packages/app-core/src/components/Header/index.tsx`        |
| `resource-cards` | `ResourceCards`                     | `packages/app-core/src/components/ResourceCards/index.tsx` |
| `scroller`       | `Scroller` (via `DynamicList` prop) | `packages/app-core/src/components/Scroller/index.tsx`      |

`@repo/ui` components with a `data-testid` prop:

| Component     | Prop                   | Forwarded to                    |
| ------------- | ---------------------- | ------------------------------- |
| `DynamicList` | `data-testid?: string` | `<div className="DynamicList">` |

`data-testid` attributes stay in production builds: [decision 0005](decisions/0005-testids-in-production-builds.md).

## Used by

| Consumer       | Target        | Where                                                                                                  |
| -------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| Agent CLI      | Dev server    | `pnpm browser validate --selector "[data-testid=…]"`                                                   |
| Playwright E2E | Preview build | [`packages/e2e/tests/app.spec.ts`](../packages/e2e/tests/app.spec.ts), run per [`docs/e2e.md`](e2e.md) |
