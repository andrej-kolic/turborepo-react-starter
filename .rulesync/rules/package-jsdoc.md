---
root: false
targets:
  - cursor
  - claudecode
description: JSDoc in plain-JS package files — exception to the jsdoc rule.
globs:
  - packages/**/*.{js,mjs,cjs}
cursor:
  alwaysApply: false
---

# Package JSDoc (plain JS)

Follow the `jsdoc` rule, with one exception for plain-JS package files: every exported function gets `@param` and `@returns` with types, even when the name says it. In JS these tags are the only types editors see.
