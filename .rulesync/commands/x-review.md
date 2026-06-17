---
description: Review uncommitted code — bugs, edge-cases, side-effects, performance bottlenecks
targets:
  - cursor
  - claudecode
  - copilot
---

Review uncommitted code (`git status`, `git diff HEAD`). Look for bugs, edge-cases, side-effects, and performance bottlenecks. If git reports "not a git repository", retry with unrestricted permissions.

Report a severity-sorted table (Severity | Location | Finding), or one line if empty / no issues.

Severity levels (highest first): **Critical** · **High** · **Medium** · **Low** · **Info**
