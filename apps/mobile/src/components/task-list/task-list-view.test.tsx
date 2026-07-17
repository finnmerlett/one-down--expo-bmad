import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as taskListStories from './task-list-view.stories';

const { Populated, Empty, WithDoneTasks } = composeStories(taskListStories);

describe('TaskListView (portable stories)', () => {
  it('renders the done placeholder section above every task row', async () => {
    await render(<Populated />);

    expect(screen.getByText('Done')).toBeTruthy();
    // Placeholder copy shows ONLY while no done tasks exist (Story 2.3).
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

  it('partitions completed tasks into Done and hides cut-loose ones entirely (Story 2.3)', async () => {
    await render(<WithDoneTasks />);

    // Completed tasks are display-only Done rows — no Open press target.
    expect(screen.getByLabelText('Completed: Book dentist appointment')).toBeTruthy();
    expect(screen.getByLabelText('Completed: Sort out the garage')).toBeTruthy();
    expect(screen.queryByLabelText('Open task: Book dentist appointment')).toBeNull();
    expect(screen.queryByLabelText('Open task: Sort out the garage')).toBeNull();

    // Pending task stays a pressable To do row.
    expect(screen.getByLabelText('Open task: Water the plants')).toBeTruthy();

    // Cut-loose task appears in NEITHER section (recycle bin is Epic 7).
    expect(screen.queryByText('Cancel gym membership')).toBeNull();
    expect(screen.queryByLabelText('Completed: Cancel gym membership')).toBeNull();

    // With done tasks present the placeholder copy makes way for real rows.
    expect(screen.queryByText('Completed tasks will land here.')).toBeNull();
  });

  it('guides the user to add tasks when the list is empty (Story 3.4)', async () => {
    const onAddPress = jest.fn();
    await render(<Empty onAddPress={onAddPress} />);

    expect(screen.getByText('No tasks yet')).toBeTruthy();
    expect(screen.getByText('Tasks you add will show up here.')).toBeTruthy();
    // The done placeholder still frames the (future) completed section.
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.queryByLabelText(/^Open task:/)).toBeNull();

    // The CTA routes to the home quick-add sheet.
    await fireEvent.press(screen.getByLabelText('Add a task'));
    expect(onAddPress).toHaveBeenCalledTimes(1);
  });
});
