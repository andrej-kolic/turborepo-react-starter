# Separate tools for checking the page and for capturing artifacts

- Status: accepted
- Date: 2026-06-20

## Context

Agents need two different things from the browser: a check that the page shows what it should while they code, and sometimes a recording (network traffic, traces, Web Vitals) to debug a problem. The check runs often and should produce no artifacts beyond an occasional screenshot; the recording exists to produce files.

## Decision

Keep two packages with two jobs:

| Job     | Package / MCP server                            | Output                                 |
| ------- | ----------------------------------------------- | -------------------------------------- |
| Verify  | `@repo/browser-tools`, `chrome-devtools` MCP    | Pass or fail, DOM and text, screenshot |
| Capture | `@repo/browser-capture`, `devtools-capture` MCP | HAR, `trace.zip`, Web Vitals, console  |

Both stay internal to the repo and are not published to npm: they wire repo-specific pieces (artifact layout, sanitization, `TARGET_URL`, agent skills) around `playwright-core`.

## Consequences

- Skills and docs keep the two apart: the browser-validation skill covers verify, the browser-capture skill covers capture.
- Capture keeps a stable contract: artifacts in `packages/browser-capture/artifacts/<mode>-<timestamp>/`, sanitized before write unless `--no-sanitize`, and MCP tool names in snake_case (`capture_snapshot`, `record_trace`, …).
- CI regression checks belong to Playwright E2E, not to either tool ([0003](0003-e2e-on-preview-build.md)).
