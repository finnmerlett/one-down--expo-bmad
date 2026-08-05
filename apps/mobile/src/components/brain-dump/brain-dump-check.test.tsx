import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as stories from './brain-dump-check.stories';

const { CheckThese } = composeStories(stories);

describe('BrainDumpCheck (D6 gate, 07f)', () => {
  it('renders task boxes with evidence quotes and the unclaimed dashed row', async () => {
    await render(<CheckThese />);

    expect(screen.getByText('Call the dentist')).toBeTruthy();
    expect(screen.getByText('call the dentist about the crown')).toBeTruthy();
    expect(screen.getByText('the shelves need to go up first')).toBeTruthy();
    expect(screen.getByText('maybe something about the loft')).toBeTruthy();
    expect(screen.getByText('1 entry not added')).toBeTruthy();
    expect(screen.getByLabelText('Add 2 tasks')).toBeTruthy();
    expect(screen.getByLabelText('Back to the dump')).toBeTruthy();
  });

  it('tap the title → caret in place; return commits the reword', async () => {
    const onRename = jest.fn();
    await render(<CheckThese onRename={onRename} />);

    await fireEvent.press(screen.getByLabelText('Reword task: Call the dentist'));
    const input = screen.getByLabelText('Reword task: Call the dentist');
    await fireEvent.changeText(input, 'Ring the dentist');
    await fireEvent(input, 'submitEditing');

    expect(onRename).toHaveBeenCalledWith(0, 'Ring the dentist');
  });

  it('× drops a box; + promotes an unclaimed line', async () => {
    const onDrop = jest.fn();
    const onPromote = jest.fn();
    await render(<CheckThese onDrop={onDrop} onPromote={onPromote} />);

    await fireEvent.press(screen.getByLabelText('Drop task: Clean out the garage'));
    expect(onDrop).toHaveBeenCalledWith(1);

    await fireEvent.press(screen.getByLabelText('Add as task: maybe something about the loft'));
    expect(onPromote).toHaveBeenCalledWith('maybe something about the loft');
  });

  it('Change these opens the dashed box and submits trimmed feedback', async () => {
    const onChangeThese = jest.fn();
    await render(<CheckThese onChangeThese={onChangeThese} />);

    await fireEvent.press(screen.getByLabelText('Change these'));
    const input = screen.getByLabelText('What should be different');
    await fireEvent.changeText(input, 'Merge the garage ones');
    await fireEvent.press(screen.getByLabelText('Send change'));

    expect(onChangeThese).toHaveBeenCalledWith('Merge the garage ones');
  });

  it('Add N tasks and Back to the dump forward to the route', async () => {
    const onAddAll = jest.fn();
    const onBackToDump = jest.fn();
    await render(<CheckThese onAddAll={onAddAll} onBackToDump={onBackToDump} />);

    await fireEvent.press(screen.getByLabelText('Add 2 tasks'));
    expect(onAddAll).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByLabelText('Back to the dump'));
    expect(onBackToDump).toHaveBeenCalledTimes(1);
  });
});
