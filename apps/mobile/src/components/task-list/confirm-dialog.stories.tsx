import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';

import { ConfirmDialog } from './confirm-dialog';

const meta = {
  title: 'task-list/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    visible: true,
    onConfirm: () => {},
    onCancel: () => {},
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Real native Modal: with `visible` pinned true it would sit above the
// on-device Storybook UI with no way back — local state keeps the
// initial-open behavior (portable-story tests rely on it) but lets Cancel
// close it, with a button to relaunch (quick-add-sheet story pattern).
function renderWithLocalState(args: React.ComponentProps<typeof ConfirmDialog>) {
  function Render() {
    const [visible, setVisible] = useState(args.visible);
    return (
      <Box className="flex-1 justify-center p-6">
        <Button aria-label="Reopen dialog" onPress={() => setVisible(true)}>
          <ButtonText>Reopen dialog</ButtonText>
        </Button>
        <ConfirmDialog {...args} visible={visible} onCancel={() => setVisible(false)} />
      </Box>
    );
  }
  return <Render />;
}

/** Story 7.1 AC2 — the star-retraction warning shown before a warned archive. */
export const ArchiveWarning: Story = {
  args: {
    title: 'Remove stars?',
    body: "Archiving started or completed tasks removes the stars they earned. This can't be undone, even if you restore them later.",
    confirmLabel: 'Archive anyway',
    cancelAccessibilityLabel: 'Cancel archive',
  },
  render: renderWithLocalState,
};

/** Story 7.1 AC5 — permanent delete confirmation. */
export const DeleteConfirm: Story = {
  args: {
    title: 'Delete permanently?',
    body: "This can't be undone.",
    confirmLabel: 'Delete forever',
    cancelAccessibilityLabel: 'Cancel delete',
  },
  render: renderWithLocalState,
};
