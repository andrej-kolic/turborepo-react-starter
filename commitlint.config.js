/**
 * commitlint configuration: Conventional Commits, checked by the
 * `.husky/commit-msg` hook and the `Verify: Commits` workflow.
 * https://commitlint.js.org/reference/configuration.html
 */

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Hard limit; aim for 50. GitHub truncates longer subjects.
    'header-max-length': [2, 'always', 72],
  },
};
