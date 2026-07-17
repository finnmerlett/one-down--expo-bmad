import type { Meta, StoryObj } from '@storybook/react';

import { EmptyState } from './empty-state';

const meta = {
  title: 'empty-state/EmptyState',
  component: EmptyState,
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithAction: Story = {
  args: {
    title: 'No tasks yet',
    body: 'Get things out of your head — add your first task.',
    actionLabel: 'Add a task',
    onAction: () => {},
  },
};

// No CTA — message-only variant (calm, factual).
export const MessageOnly: Story = {
  args: {
    title: 'All clear',
    body: 'Nothing waiting right now. Add a task or check your list.',
  },
};
