const path = require('path');

console.log('*', path.join(__dirname, './src'));

module.exports = {
  extends: ["custom/react-internal"],
  ignorePatterns: ["node_modules/", "dist/", "build/", "turbo/"],
  rules: {
    "import/no-extraneous-dependencies": [
        "error",
        { "devDependencies": true, "optionalDependencies": false, "peerDependencies": false }
    ],
  },
}
