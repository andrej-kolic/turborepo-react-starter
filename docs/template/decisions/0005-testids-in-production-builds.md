# `data-testid` attributes stay in production builds

- Status: accepted
- Date: 2026-06-06

## Context

Agents and Playwright E2E find page regions by `data-testid` ([contract](../component-validation-contract.md)). E2E runs on the production preview, and agents also check deployed URLs. Stripping the attributes from production builds would need a second build configuration just for testing.

## Decision

Keep `data-testid` attributes in every build, production included. This repo is a public frontend starter, and the attributes carry no security risk for it.

## Consequences

- Agents and E2E can check any build or deployed URL with the same selectors.
- A library or security-sensitive product built from this template should strip them with a bundler transform.
