import type { Meta, StoryObj } from '@storybook/react';
import { TASK_CONTEXTS } from '@one-down/shared';

import { ContextSheet } from './context-sheet';

const meta = {
  title: 'stack-filters/ContextSheet',
  component: ContextSheet,
  args: {
    onToggleContext: () => {},
    onSetMode: () => {},
    onDone: () => {},
    availableContexts: new Set(TASK_CONTEXTS),
  },
} satisfies Meta<typeof ContextSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Expanded: Story = {
  args: {
    activeContexts: ['home', 'phone', 'internet'],
    mode: 'quick_win',
  },
};

/** Unavailable contexts ghost out (AC4 carry-over from 3.1). */
export const SomeUnavailable: Story = {
  args: {
    activeContexts: ['home'],
    mode: null,
    availableContexts: new Set(['home', 'phone'] as const),
  },
};
