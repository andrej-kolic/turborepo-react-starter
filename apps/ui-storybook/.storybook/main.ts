import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { StorybookConfig } from '@storybook/react-vite';

const require = createRequire(import.meta.url);

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    getAbsolutePath('@storybook/addon-onboarding'),
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@chromatic-com/storybook'),
    getAbsolutePath('@storybook/addon-docs'),
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },

  // INFO: uncomment to see merged configuration
  // async viteFinal(config, options) {
  //   console.log("*** vite config:", config);
  //   console.log("*** vite options:", options);
  //   return config;
  // },
};
export default config;

function getAbsolutePath(value: string): string {
  return dirname(require.resolve(join(value, 'package.json')));
}
