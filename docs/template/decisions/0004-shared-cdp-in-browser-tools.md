# Chrome connection code lives in `@repo/browser-tools`

- Status: accepted
- Date: 2026-06-20

## Context

Both browser packages talk to Chrome over CDP (the Chrome DevTools Protocol: connecting, listing tabs, reading the console). `@repo/browser-capture` was one 1,700-line script with its own copy of that code.

## Decision

Keep the CDP code in one place: `@repo/browser-tools` exports it as `@repo/browser-tools/cdp`, and `@repo/browser-capture` depends on it.

## Consequences

- A fix to tab matching or connection handling reaches both CLIs at once; `--attach` picks the tab the same way in both.
- `@repo/browser-capture` cannot be used without `@repo/browser-tools`.
- A change to the `./cdp` exports must keep `@repo/browser-capture` working.
