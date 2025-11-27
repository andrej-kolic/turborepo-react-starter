import type { Meta, StoryObj } from '@storybook/react-vite';
// import { fn } from "storybook/test";
import { DynamicList } from '@repo/ui';

const meta = {
  title: 'Example/DynamicList',
  component: DynamicList,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: 'fullscreen',
    // backgrounds: { default: 'maroon' },
  },
  args: {},
} satisfies Meta<typeof DynamicList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: Array.from({ length: 5 }, (_, i) => ({
      id: `item-${i + 1}`,
      content: `Item ${i + 1}`,
    })),
    listStatus: 'idle',
    fetchNext: async () => {
      console.log('Fetching next items...');
      // Simulate a network request
      return new Promise((resolve) => setTimeout(resolve, 1000));
    },
    abortFetch: () => {
      console.log('Fetch aborted.');
    },
  },
};

// export const ExternalLink: Story = {
//   args: {
//     title: 'DynamicList Title',
//     href: 'http://example.com',
//     children: 'Children',
//   },
// };
