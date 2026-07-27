import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { TaskData } from '@one-down/shared';

import { makeTask } from '@/components/card-stack/task-card.stories';
import * as taskListStories from './task-list-view.stories';
import { binTasksForList, splitTasksForList } from './task-list-view';

const { NoDoneTasks, Empty, WithDoneTasks, MultiSelect, RecycleBin, EmptyBin } =
  composeStories(taskListStories);

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

  it('excludes cut-loose and archived tasks from both sections (Story 7.1)', () => {
    const { done, todo } = splitTasksForList([
      makeTask({ id: 'gone', status: 'cut_loose' }),
      makeTask({ id: 'binned', status: 'archived' }),
      makeTask({ id: 'kept' }),
    ]);

    expect(done).toEqual([]);
    expect(todo.map((task) => task.id)).toEqual(['kept']);
  });

  it('returns empty partitions for empty input', () => {
    expect(splitTasksForList([])).toEqual({ done: [], todo: [] });
  });
});

describe('binTasksForList (Story 7.1)', () => {
  it('keeps only archived and cut-loose tasks, most recently binned first', () => {
    const bin = binTasksForList([
      makeTask({ id: 'active' }),
      makeTask({ id: 'done', status: 'completed' }),
      makeTask({
        id: 'archived-early',
        status: 'archived',
        updatedAt: new Date('2026-06-03T10:00:00Z'),
      }),
      makeTask({
        id: 'released-late',
        status: 'cut_loose',
        updatedAt: new Date('2026-06-05T10:00:00Z'),
      }),
    ]);

    expect(bin.map((task) => task.id)).toEqual(['released-late', 'archived-early']);
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

    // Done rows show plain title text (Maestro-visible) with NO press target —
    // the only affordance is the sibling Undo button (undo-complete, 2026-07-27).
    expect(screen.getByText('Book dentist appointment')).toBeTruthy();
    expect(screen.getByText('Sort out the garage')).toBeTruthy();
    expect(screen.queryByLabelText('Open task: Book dentist appointment')).toBeNull();
    expect(screen.queryByLabelText('Open task: Sort out the garage')).toBeNull();
    expect(screen.getByLabelText('Undo completion: Book dentist appointment')).toBeTruthy();

    // Active tasks stay pressable To do rows.
    expect(screen.getByLabelText('Open task: Water the plants')).toBeTruthy();
    expect(screen.getByLabelText('Open task: Email the plumber')).toBeTruthy();

    // Cut-loose task appears in NEITHER section (recycle bin is Epic 7).
    expect(screen.queryByText('Cancel gym membership')).toBeNull();
  });

  it('reports the done task from its Undo button (undo-complete, 2026-07-27)', async () => {
    const onUndoComplete = jest.fn();
    await render(<WithDoneTasks onUndoComplete={onUndoComplete} />);

    fireEvent.press(screen.getByLabelText('Undo completion: Book dentist appointment'));

    expect(onUndoComplete).toHaveBeenCalledTimes(1);
    expect(onUndoComplete.mock.calls[0]?.[0]?.title).toBe('Book dentist appointment');
  });

  it('multi-select rows toggle instead of navigating and announce state (Story 7.1)', async () => {
    const onToggleSelect = jest.fn();
    const onTaskPress = jest.fn();
    await render(<MultiSelect onToggleSelect={onToggleSelect} onTaskPress={onTaskPress} />);

    // Selected row announces its state; unselected rows offer selection.
    expect(screen.getByLabelText('Selected, task: Water the plants')).toBeTruthy();
    expect(screen.queryByLabelText('Open task: Water the plants')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Select task: Email the plumber'));
    expect(onToggleSelect.mock.calls[0]?.[0]?.id).toBe('task-2');
    expect(onTaskPress).not.toHaveBeenCalled();

    // Done rows are selectable too (archiving completed tasks is the warned path).
    await fireEvent.press(screen.getByLabelText('Select task: Book dentist appointment'));
    expect(onToggleSelect.mock.calls[1]?.[0]?.id).toBe('task-3');
  });

  it('long-press on a row reports it for selection entry (Story 7.1 AC1)', async () => {
    const onLongPressTask = jest.fn();
    await render(<NoDoneTasks onLongPressTask={onLongPressTask} />);

    await fireEvent(screen.getByLabelText('Open task: Sort out the garage'), 'longPress');

    expect(onLongPressTask.mock.calls[0]?.[0]?.id).toBe('task-2');
  });

  it('renders the recycle bin with origin labels and per-row restore (Story 7.1 AC4/AC6)', async () => {
    const onRestore = jest.fn();
    await render(<RecycleBin onRestore={onRestore} />);

    expect(screen.getByLabelText('Bin task: Old project notes')).toBeTruthy();
    expect(screen.getByLabelText('Bin task: Cancel gym membership')).toBeTruthy();
    expect(screen.getByText('Archived')).toBeTruthy();
    expect(screen.getByText('Cut loose')).toBeTruthy();
    // Active tasks never appear in the bin.
    expect(screen.queryByText('Water the plants')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Restore task: Old project notes'));
    expect(onRestore.mock.calls[0]?.[0]?.id).toBe('task-1');
  });

  it('shows the calm empty-bin state (Story 7.1)', async () => {
    await render(<EmptyBin />);

    expect(screen.getByText('Nothing here')).toBeTruthy();
    expect(screen.getByText("Everything's active.")).toBeTruthy();
    expect(screen.queryByLabelText(/^Bin task:/)).toBeNull();
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
