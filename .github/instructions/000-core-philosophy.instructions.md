---
description: >-
  Always-applied principles: research-first workflow, simplicity, concise
  communication, and pre-done quality checks.
applyTo: '*'
---
# Engineering Philosophy

Turborepo + pnpm monorepo, TypeScript strict. Branch: `develop`. Repo commands: `AGENTS.md`.

## Before you write

- Read `package.json`, configs, and source before proposing changes — never guess.
- Follow existing patterns; identify the right layer: app, package, infra, or scripts.
- When multiple approaches exist, list tradeoffs concisely before coding.

## Simplicity (KISS & YAGNI)

- Write the minimum code that cleanly solves the problem.
- No abstractions, wrappers, or "future-proof" utilities without a concrete second use case.
- Prefer explicit, readable code over clever one-liners.
- Short, single-purpose functions; keep orchestration out of components.

## Communication

- Be concise — skip filler ("Sure, I can help with that").
- Go straight to the explanation, solution, or execution.
- In code blocks, show only changed segments — not hundreds of unchanged lines.

## Code style

- No comments that narrate what the code does. Comments explain _why_, not _what_.

## Before calling it done

Run `pnpm lint`, `pnpm test`, and `pnpm check:type`.
