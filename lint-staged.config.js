/**
 * lint-staged configuration file. Can be per package, see
 * https://github.com/lint-staged/lint-staged?tab=readme-ov-file#how-to-use-lint-staged-in-a-multi-package-monorepo
 */

export default {
  '*.{js,jsx,ts,tsx}': [
    'oxlint --type-aware --fix',
    'oxfmt --no-error-on-unmatched-pattern',
  ],
  '*.{md,mdx,mjs,yml,yaml,css,json,jsonc}': [
    'oxfmt --no-error-on-unmatched-pattern',
  ],
  '*.{md,mdc}': ['node scripts/check-links.js'],
  '.rulesync/**/*': [() => 'pnpm sync:agents', () => 'pnpm check:agents'],
  '{.cursor/rules/*.mdc,.cursor/commands/**/*.md,.claude/rules/**/*.md,.claude/skills/**/SKILL.md,.claude/commands/**/*.md,.cursor/mcp.json}':
    () => 'pnpm check:agents',
};
