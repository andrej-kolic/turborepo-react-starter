/**
 * lint-staged configuration file. Can be per package, see
 * https://github.com/lint-staged/lint-staged?tab=readme-ov-file#how-to-use-lint-staged-in-a-multi-package-monorepo
 */

export default {
  // "*.{js,cjs,mjs,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],

  // "!(*.js|*.cjs|*.mjs|*.jsx|*.ts|*.tsx)": ["prettier --write"]

  '*.{js,jsx,ts,tsx}': [
    'eslint --flag unstable_config_lookup_from_file --fix',
    'prettier --write',
  ],
  '*.{md,mdx,mjs,yml,yaml,css,json}': ['prettier --write'],
};
