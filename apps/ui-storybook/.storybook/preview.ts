import type { Preview } from '@storybook/react-vite';

import '@repo/ui/theme.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      options: {
        // 👇 Default options
        dark: { name: 'Dark', value: '#333' },
        light: { name: 'Light', value: '#F7F9F2' },
        // 👇 Add your own
        maroon: { name: 'Maroon', value: '#400' },
        cfblue: { name: 'CF Blue', value: 'cornflowerblue' },
      },
    },
  },

  initialGlobals: {
    // 👇 Set the initial background color
    backgrounds: { value: 'cfblue' },
  },

  // INFO: uncomment to enable auto-generated documentation for all stories
  // tags: ["autodocs"],
};

export default preview;
