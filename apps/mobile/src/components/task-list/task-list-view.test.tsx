import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as taskListStories from './task-list-view.stories';

const { Populated, Empty } = composeStories(taskListStories);

describe('TaskListView (portable stories)', () => {
  it('renders the done placeholder section above every task row', async () => {
    await render(<Populated />);

    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.getByText('Completed tasks will land here.')).toBeTruthy();
    expect(screen.getByText('To do')).toBeTruthy();
    expect(screen.getByText('Book dentist appointment')).toBeTruthy();
    expect(screen.getByText('Sort out the garage')).toBeTruthy();
    expect(screen.getByText('Water the plants')).toBeTruthy();
  });

  it('shows size, contexts, and deadline as row metadata', async () => {
    await render(<Populated />);

    // Same formatting call as the component — locale-independent assertion.
    const expectedDeadline = new Date('2026-06-20T09:00:00Z').toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    expect(screen.getByText(`Quick win · Home · Phone · ${expectedDeadline}`)).toBeTruthy();
    expect(screen.getByText('Big time')).toBeTruthy();
  });

  it('reports the pressed task', async () => {
    const onTaskPress = jest.fn();
    await render(<Populated onTaskPress={onTaskPress} />);

    await fireEvent.press(screen.getByLabelText('Open task: Sort out the garage'));

    expect(onTaskPress).toHaveBeenCalledTimes(1);
    expect(onTaskPress.mock.calls[0]?.[0]?.id).toBe('task-2');
  });

  it('guides the user to add tasks when the list is empty', async () => {
    await render(<Empty />);

    expect(screen.getByText('No tasks yet')).toBeTruthy();
    expect(screen.getByText('Head back and tap the + button to add your first task.')).toBeTruthy();
    // The done placeholder still frames the (future) completed section.
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.queryByLabelText(/^Open task:/)).toBeNull();
  });
});
