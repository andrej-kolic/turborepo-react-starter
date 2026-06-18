---
root: false
targets:
  - cursor
  - claudecode
  - copilot
description: TypeScript conventions. Auto-attaches to .ts and .tsx files.
globs:
  - '**/*.ts'
  - '**/*.tsx'
cursor:
  alwaysApply: false
---

# TypeScript

- Infer types — annotate only what TS cannot infer.
- `as const` over enums.
- `satisfies` over `as` when narrowing config or literal objects — keeps the type narrow without widening.
- Avoid non-null assertions (`!`). If unavoidable, add a `// NOTE:` comment explaining why.
- Mark params and data structures `readonly` when mutation is not intended.

```typescript
// ✅
const Status = { Active: 'active', Inactive: 'inactive' } as const;

type Config = { timeout: number; retries: number };
const defaults = { timeout: 5000, retries: 3 } satisfies Config;

// ❌
enum Status {
  Active,
  Inactive,
}
const defaults = { timeout: 5000, retries: 3 } as Config;
```
