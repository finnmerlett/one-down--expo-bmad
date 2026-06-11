import type { Meta, StoryObj } from '@storybook/react';

import { QuickAddSheet } from './quick-add-sheet';

const meta = {
  title: 'quick-add-sheet/QuickAddSheet',
  component: QuickAddSheet,
  args: {
    isOpen: true,
    onClose: () => {},
    onSubmit: async () => {},
  },
} satisfies Meta<typeof QuickAddSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {};
