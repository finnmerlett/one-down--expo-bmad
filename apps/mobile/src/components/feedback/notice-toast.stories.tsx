import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { NoticeToast } from './notice-toast';

const meta = {
  title: 'feedback/NoticeToast',
  component: NoticeToast,
  decorators: [
    (Story) => (
      <Box className="flex-1 items-center bg-background-50 pt-8">
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof NoticeToast>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Story 7.1 — bulk archive confirmation with the retraction suffix. */
export const ArchivedWithStars: Story = {
  args: {
    nativeID: 'toast-archived',
    message: 'Archived 2 tasks — ★12 removed',
  },
};

/** Story 7.1 — frictionless restore acknowledgment. */
export const Restored: Story = {
  args: {
    nativeID: 'toast-restored',
    message: 'Restored',
  },
};
