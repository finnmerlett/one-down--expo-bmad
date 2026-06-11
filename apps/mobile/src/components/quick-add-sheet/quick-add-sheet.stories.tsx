import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';

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

// The sheet is a real native Modal: with isOpen pinned to true it would sit
// above the on-device Storybook UI with no way back. Local state keeps the
// initial-open behavior (portable-story tests rely on it) but lets the
// backdrop close it, with a button to relaunch.
export const Open: Story = {
  render: function Render(args) {
    const [isOpen, setIsOpen] = useState(args.isOpen);
    return (
      <Box className="flex-1 justify-center p-6">
        <Button aria-label="Reopen sheet" onPress={() => setIsOpen(true)}>
          <ButtonText>Reopen sheet</ButtonText>
        </Button>
        <QuickAddSheet {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </Box>
    );
  },
};
