import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as bulkActionBarStories from './bulk-action-bar.stories';

const { ActiveTab, BinTab, NothingSelected } = composeStories(bulkActionBarStories);

describe('BulkActionBar (portable stories)', () => {
  it('shows the count and the active-tab archive action', async () => {
    const onArchive = jest.fn();
    const onCancel = jest.fn();
    await render(<ActiveTab onArchive={onArchive} onCancel={onCancel} />);

    expect(screen.getByText('3 selected')).toBeTruthy();
    expect(screen.queryByLabelText('Delete')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Archive'));
    expect(onArchive).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByLabelText('Exit selection'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('offers restore + delete on the bin tab', async () => {
    const onDelete = jest.fn();
    const onRestore = jest.fn();
    await render(<BinTab onDelete={onDelete} onRestore={onRestore} />);

    expect(screen.queryByLabelText('Archive')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Delete'));
    await fireEvent.press(screen.getByLabelText('Restore selected'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it('disables the bulk action at zero selected but keeps Cancel live', async () => {
    const onArchive = jest.fn();
    const onCancel = jest.fn();
    await render(<NothingSelected onArchive={onArchive} onCancel={onCancel} />);

    await fireEvent.press(screen.getByLabelText('Archive'));
    expect(onArchive).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Exit selection'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
