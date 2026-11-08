import { defineConfig } from 'oxlint';
import base from './base.ts';

/** Shared oxlint config for React packages: the base config plus React rules. */
export default defineConfig({
  ...base,
  plugins: [...(base.plugins ?? []), 'react'],
});
