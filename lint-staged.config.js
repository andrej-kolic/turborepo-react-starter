/**
 * lint-staged configuration file. Can be per package, see
 * https://github.com/lint-staged/lint-staged?tab=readme-ov-file#how-to-use-lint-staged-in-a-multi-package-monorepo
 */

export default {
  // "*.{js,cjs,mjs,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],

  // "!(*.js|*.cjs|*.mjs|*.jsx|*.ts|*.tsx)": ["prettier --write"]

  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{md,mdx,mjs,yml,yaml,css,json,jsonc}': ['prettier --write'],
  '{.cursor,.vscode}/mcp.json': () => 'node scripts/check-mcp-config.mjs',
};
