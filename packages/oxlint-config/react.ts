import { defineConfig } from 'oxlint';
import base from './base.ts';

/** Shared oxlint config for React packages: the base config plus React and accessibility rules. */
export default defineConfig({
  ...base,
  plugins: [...(base.plugins ?? []), 'react', 'jsx-a11y'],
  rules: {
    ...base.rules,
    'react/react-in-jsx-scope': 'off',
    'react/rules-of-hooks': 'error',
    'react/only-export-components': ['warn', { allowConstantExport: true }],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'react',
            importNames: ['forwardRef', 'useContext'],
            message: 'React 19: pass ref as a prop; read context with use().',
          },
        ],
      },
    ],
  },
});
