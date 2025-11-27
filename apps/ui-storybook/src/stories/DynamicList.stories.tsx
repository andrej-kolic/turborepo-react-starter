import type { Meta, StoryObj } from '@storybook/react-vite';
// import { fn } from "storybook/test";
import { DynamicList } from '@repo/ui';
import { empty, emptyAsync } from '../utils';

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
    fetchNext: emptyAsync,
    abortFetch: empty,
  },
};

export const Loading: Story = {
  args: {
    items: Array.from({ length: 2 }, (_, i) => ({
      id: `item-${i + 1}`,
      content: `Item ${i + 1}`,
    })),
    listStatus: 'loading',
    fetchNext: emptyAsync,
    abortFetch: empty,
  },
};

export const Aborted: Story = {
  args: {
    items: Array.from({ length: 2 }, (_, i) => ({
      id: `item-${i + 1}`,
      content: `Item ${i + 1}`,
    })),
    listStatus: 'aborted',
    fetchNext: emptyAsync,
    abortFetch: empty,
  },
};
export const Error: Story = {
  args: {
    items: Array.from({ length: 2 }, (_, i) => ({
      id: `item-${i + 1}`,
      content: `Item ${i + 1}`,
    })),
    listStatus: 'error',
    fetchNext: emptyAsync,
    abortFetch: empty,
  },
};
export const Idle: Story = {
  args: {
    items: Array.from({ length: 2 }, (_, i) => ({
      id: `item-${i + 1}`,
      content: `Item ${i + 1}`,
    })),
    listStatus: 'idle',
    fetchNext: emptyAsync,
    abortFetch: empty,
  },
};
export const Done: Story = {
  args: {
    items: Array.from({ length: 2 }, (_, i) => ({
      id: `item-${i + 1}`,
      content: `Item ${i + 1}`,
    })),
    listStatus: 'done',
    fetchNext: emptyAsync,
    abortFetch: empty,
  },
};
