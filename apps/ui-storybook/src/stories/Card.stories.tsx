import type { Meta, StoryObj } from "@storybook/react";
// import { fn } from "@storybook/test";
import { Card } from "@repo/ui";

const meta = {
  title: "Example/Card",
  component: Card,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: "fullscreen",
  },
  args: {},
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Card Title",
    href: "#",
    children: "Children",
  },
};

export const ExternalLink: Story = {
  args: {
    title: "Card Title",
    href: "http://example.com",
    children: "Children",
  },
};
