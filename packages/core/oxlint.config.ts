import { defineConfig } from 'oxlint';
import base from '@repo/oxlint-config/base';

export default defineConfig({
  ...base,
  rules: {
    ...base.rules,
    // Worker globals the tsconfig's webworker lib allows, which Node or React Native lack.
    'no-restricted-globals': [
      'error',
      { name: 'self', message: 'core runs in Node and React Native too.' },
      { name: 'caches', message: 'core runs in Node and React Native too.' },
      {
        name: 'postMessage',
        message: 'core runs in Node and React Native too.',
      },
      { name: 'indexedDB', message: 'core runs in Node and React Native too.' },
    ],
  },
});
