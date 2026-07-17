import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { TaskData } from '@one-down/shared';

import { makeTask } from '@/components/card-stack/task-card.stories';
import * as taskListStories from './task-list-view.stories';
import { splitTasksForList } from './task-list-view';

const { NoDoneTasks, Empty, WithDoneTasks } = composeStories(taskListStories);

describe('splitTasksForList (Story 4.4)', () => {
  const completed = (id: string, updatedAt: string): TaskData =>
    makeTask({ id, title: id, status: 'completed', updatedAt: new Date(updatedAt) });

  it('sorts done by updatedAt ascending and preserves todo input order', () => {
    const pendingA = makeTask({ id: 'pending-a', title: 'A' });
    const inProgress = makeTask({ id: 'in-progress', title: 'B', status: 'in_progress' });
    const tasks = [
      completed('done-late', '2026-06-05T10:00:00Z'),
      pendingA,
      completed('done-early', '2026-06-03T10:00:00Z'),
      inProgress,
    ];

    const { done, todo } = splitTasksForList(tasks);

    expect(done.map((task) => task.id)).toEqual(['done-early', 'done-late']);
    expect(todo.map((task) => task.id)).toEqual(['pending-a', 'in-progress']);
  });

  it('excludes cut-loose tasks from both sections', () => {
    const { done, todo } = splitTasksForList([
      makeTask({ id: 'gone', status: 'cut_loose' }),
      makeTask({ id: 'kept' }),
    ]);

    expect(done).toEqual([]);
    expect(todo.map((task) => task.id)).toEqual(['kept']);
  });

  it('returns empty partitions for empty input', () => {
    expect(splitTasksForList([])).toEqual({ done: [], todo: [] });
  });
});

describe('TaskListView (portable stories)', () => {
  it('hides both section headers when nothing is completed (AC3)', async () => {
    await render(<NoDoneTasks />);

    expect(screen.queryByText('Done')).toBeNull();
    expect(screen.queryByText('To do')).toBeNull();
    expect(screen.getByText('Book dentist appointment')).toBeTruthy();
    expect(screen.getByText('Sort out the garage')).toBeTruthy();
    expect(screen.getByText('Water the plants')).toBeTruthy();
  });

  it('shows size, contexts, and deadline as row metadata', async () => {
    await render(<NoDoneTasks />);

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
    await render(<NoDoneTasks onTaskPress={onTaskPress} />);

    await fireEvent.press(screen.getByLabelText('Open task: Sort out the garage'));

    expect(onTaskPress).toHaveBeenCalledTimes(1);
    expect(onTaskPress.mock.calls[0]?.[0]?.id).toBe('task-2');
  });

  it('renders the Done section above To do with display-only muted rows (Story 4.4)', async () => {
    await render(<WithDoneTasks />);

    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.getByText('To do')).toBeTruthy();

    // Done rows show plain title text (Maestro-visible) with NO press target.
    expect(screen.getByText('Book dentist appointment')).toBeTruthy();
    expect(screen.getByText('Sort out the garage')).toBeTruthy();
    expect(screen.queryByLabelText('Open task: Book dentist appointment')).toBeNull();
    expect(screen.queryByLabelText('Open task: Sort out the garage')).toBeNull();

    // Active tasks stay pressable To do rows.
    expect(screen.getByLabelText('Open task: Water the plants')).toBeTruthy();
    expect(screen.getByLabelText('Open task: Email the plumber')).toBeTruthy();

    // Cut-loose task appears in NEITHER section (recycle bin is Epic 7).
    expect(screen.queryByText('Cancel gym membership')).toBeNull();
  });

  it('guides the user to add tasks when the list is empty (Story 3.4)', async () => {
    const onAddPress = jest.fn();
    await render(<Empty onAddPress={onAddPress} />);

    expect(screen.getByText('No tasks yet')).toBeTruthy();
    expect(screen.getByText('Tasks you add will show up here.')).toBeTruthy();
    // No headers frame the empty state (Story 4.4 AC3).
    expect(screen.queryByText('Done')).toBeNull();
    expect(screen.queryByText('To do')).toBeNull();
    expect(screen.queryByLabelText(/^Open task:/)).toBeNull();

    // The CTA routes to the home quick-add sheet.
    await fireEvent.press(screen.getByLabelText('Add a task'));
    expect(onAddPress).toHaveBeenCalledTimes(1);
  });
});
