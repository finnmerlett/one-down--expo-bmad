import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { BulkActionBar } from './bulk-action-bar';

const meta = {
  title: 'task-list/BulkActionBar',
  component: BulkActionBar,
  decorators: [
    (Story) => (
      <Box className="flex-1 justify-end bg-background-50">
        <Story />
      </Box>
    ),
  ],
  args: {
    onArchive: () => {},
    onRestore: () => {},
    onDelete: () => {},
    onCancel: () => {},
  },
} satisfies Meta<typeof BulkActionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Story 7.1 — active tab: count + Archive. */
export const ActiveTab: Story = {
  args: { count: 3, mode: 'active' },
};

/** Story 7.1 — recycle bin tab: Restore + Delete. */
export const BinTab: Story = {
  args: { count: 2, mode: 'bin' },
};

/** Everything deselected: actions disable, the bar stays (no layout jump). */
export const NothingSelected: Story = {
  args: { count: 0, mode: 'active' },
};
