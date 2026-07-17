import type { Meta, StoryObj } from '@storybook/react';
import { TASK_CONTEXTS } from '@one-down/shared';

import { ContextToggleBar } from './context-toggle-bar';

const ALL_CONTEXTS = new Set(TASK_CONTEXTS);

const meta = {
  title: 'stack-filters/ContextToggleBar',
  component: ContextToggleBar,
  args: { onToggle: () => {} },
} satisfies Meta<typeof ContextToggleBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllInactive: Story = {
  args: { activeContexts: [], availableContexts: ALL_CONTEXTS },
};

export const TwoActive: Story = {
  args: { activeContexts: ['home', 'phone'], availableContexts: ALL_CONTEXTS },
};

// Laptop/internet have no matching browsable tasks — greyed out + disabled.
export const SomeDisabled: Story = {
  args: { activeContexts: [], availableContexts: new Set(['home', 'out_and_about', 'phone']) },
};

// AC4 UX rule: an ACTIVE context with no matching tasks stays enabled so the
// user can see/leave the empty result.
export const ActiveButEmpty: Story = {
  args: { activeContexts: ['laptop'], availableContexts: new Set(['home']) },
};
