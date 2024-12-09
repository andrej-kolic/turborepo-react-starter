module.exports = {
  extends: ['@repo/eslint-config/react-internal.js'],
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'turbo/'],
  // rules: {
  //   "import/no-extraneous-dependencies": [
  //     "error",
  //     {
  //       devDependencies: true,
  //       optionalDependencies: false,
  //       peerDependencies: false,
  //     },
  //   ],
  // },
  // env: {
  //   browser: true,
  //   // amd: true,
  //   node: true,
  // },
};
