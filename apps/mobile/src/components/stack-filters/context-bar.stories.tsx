import type { Meta, StoryObj } from '@storybook/react';

import { ContextBar } from './context-bar';

const meta = {
  title: 'stack-filters/ContextBar',
  component: ContextBar,
  args: {
    onExpand: () => {},
  },
} satisfies Meta<typeof ContextBar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Nothing selected (= unfiltered): all five glyphs show dimmed. */
export const AllContexts: Story = {
  args: { activeContexts: [] },
};

/** A picked set — only the selected glyphs render, in muted ink. */
export const ThreeSelected: Story = {
  args: { activeContexts: ['home', 'phone', 'internet'] },
};
