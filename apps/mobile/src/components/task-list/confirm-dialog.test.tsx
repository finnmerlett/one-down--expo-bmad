import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as confirmDialogStories from './confirm-dialog.stories';

const { ArchiveWarning, DeleteConfirm } = composeStories(confirmDialogStories);

describe('ConfirmDialog (portable stories)', () => {
  it('renders the archive warning copy and reports confirm', async () => {
    const onConfirm = jest.fn();
    await render(<ArchiveWarning onConfirm={onConfirm} />);

    expect(screen.getByText('Remove stars?')).toBeTruthy();
    expect(
      screen.getByText(
        "Archiving started or completed tasks removes the stars they earned. This can't be undone, even if you restore them later.",
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Archive anyway'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancel dismisses without confirming (AC7 — no action taken)', async () => {
    const onConfirm = jest.fn();
    await render(<DeleteConfirm onConfirm={onConfirm} />);

    expect(screen.getByText('Delete permanently?')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Cancel delete'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByText('Delete permanently?')).toBeNull();
  });
});
