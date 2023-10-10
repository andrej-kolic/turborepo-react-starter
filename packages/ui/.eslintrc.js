const path = require('path');

console.log('*', path.join(__dirname, './src'));

module.exports = {
  extends: ["custom/react-internal"],
  ignorePatterns: ["node_modules/", "dist/", "build/", "turbo/"],
  // plugins: ["import"],
  settings: {
    'import/resolver': {
      alias: {
        // map: [
        //   ['~', './src'],
        // ],
        '~': path.join(__dirname, './src'),
        extensions: ['.ts', 'tsx', '.js', '.jsx', '.json']
      }
    }
  }
};
