import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { BrainDumpInput } from './brain-dump-input';

const meta = {
  title: 'brain-dump/BrainDumpInput',
  component: BrainDumpInput,
  args: {
    onSubmit: () => undefined,
    onQuickAddInstead: () => undefined,
  },
  decorators: [
    (Story) => (
      <Box className="flex-1 bg-background-0 pt-4" style={{ minHeight: 480 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof BrainDumpInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: { state: 'idle' },
};

/** Quiet first second of a parse — input disabled, spinner not yet shown. */
export const Submitted: Story = {
  args: { state: 'submitted' },
};

export const Parsing: Story = {
  args: { state: 'parsing' },
};

/** Past the 4s escalation — the "taking longer" line appears (AC3). */
export const ParsingLong: Story = {
  args: { state: 'parsing_long' },
};

/** Network failure — inline copy, retry stays available, quick add offered (AC5). */
export const ErrorState: Story = {
  args: { state: 'error' },
};
