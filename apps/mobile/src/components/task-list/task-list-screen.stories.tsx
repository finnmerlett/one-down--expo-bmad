import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import type { TaskData } from '@one-down/shared';

import { makeTask } from '@/components/card-stack/task-card.stories';

import { TaskListScreen, type TaskListDialog } from './task-list-screen';
import type { TaskListMode } from './task-list-view';

/** A realistic active list: a live bonus row, varied sizes, a done section. */
const ACTIVE_TASKS: TaskData[] = [
  makeTask({
    id: 'task-bonus',
    title: 'Book dentist appointment',
    size: 'quick_win',
    contexts: '["phone"]',
    deadline: new Date('2026-06-20T09:00:00Z'),
  }),
  makeTask({ id: 'task-garage', title: 'Sort out the garage', size: 'big_time' }),
  makeTask({
    id: 'task-plants',
    title: 'Water the plants',
    size: 'quick_win',
    contexts: '["home"]',
  }),
  makeTask({ id: 'task-plumber', title: 'Email the plumber', contexts: '["laptop","internet"]' }),
  makeTask({
    id: 'task-insurance',
    title: 'Renew car insurance',
    status: 'completed',
    updatedAt: new Date('2026-06-04T10:00:00Z'),
  }),
  makeTask({
    id: 'task-passport',
    title: 'Renew passport',
    status: 'completed',
    updatedAt: new Date('2026-06-05T10:00:00Z'),
  }),
];

const BIN_TASKS: TaskData[] = [
  ...ACTIVE_TASKS.slice(0, 2),
  makeTask({
    id: 'task-notes',
    title: 'Old project notes',
    status: 'archived',
    updatedAt: new Date('2026-06-05T10:00:00Z'),
  }),
  makeTask({
    id: 'task-gym',
    title: 'Cancel gym membership',
    status: 'cut_loose',
    updatedAt: new Date('2026-06-04T10:00:00Z'),
  }),
];

const starValue = (task: TaskData) => (task.size === 'big_time' ? 20 : 5);
const badge = (task: TaskData) =>
  task.id === 'task-bonus'
    ? { kind: 'window' as const, amount: 3, reason: 'BONUS UNTIL SAT' }
    : null;
const noop = () => {};

/**
 * Screen stories hold the screen's own UI state (tab, selection, dialog)
 * locally, seeded from args — so on the canvas the tabs switch, long-press
 * enters multi-select and the bulk actions open their dialogs, just like
 * the app. Data writes are no-ops.
 */
function InteractiveTaskList({
  tasks,
  initialTab = 'active',
  initialSelection = null,
  initialDialog = null,
}: {
  tasks: TaskData[];
  initialTab?: TaskListMode;
  initialSelection?: string[] | null;
  initialDialog?: TaskListDialog;
}) {
  const [tab, setTab] = useState(initialTab);
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(
    initialSelection ? new Set(initialSelection) : null,
  );
  const [dialog, setDialog] = useState(initialDialog);
  const exitSelection = () => {
    setSelectedIds(null);
    setDialog(null);
  };
  return (
    <TaskListScreen
      tasks={tasks}
      tab={tab}
      onTabChange={(next) => {
        setTab(next);
        exitSelection();
      }}
      selectedIds={selectedIds}
      onToggleSelect={(task) =>
        setSelectedIds((previous) => {
          if (!previous) return previous;
          const next = new Set(previous);
          if (next.has(task.id)) next.delete(task.id);
          else next.add(task.id);
          return next;
        })
      }
      onLongPressTask={(task) => setSelectedIds((previous) => previous ?? new Set([task.id]))}
      onRestore={noop}
      onUndoComplete={noop}
      getStarValue={starValue}
      getBadge={badge}
      onTaskPress={noop}
      onAddPress={noop}
      onBack={noop}
      onArchive={() => setDialog('archive')}
      onRestoreSelection={exitSelection}
      onDeletePress={() => setDialog('delete')}
      onCancelSelection={exitSelection}
      dialog={dialog}
      onConfirmArchive={exitSelection}
      onConfirmDelete={exitSelection}
      onDismissDialog={() => setDialog(null)}
    />
  );
}

const meta = {
  title: 'screens/TaskList',
  component: InteractiveTaskList,
  args: { tasks: ACTIVE_TASKS },
} satisfies Meta<typeof InteractiveTaskList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Frame 08: star values on rows, a gold bonus row, Done section below. */
export const Active: Story = {};

/** Nothing captured yet — the shared EmptyState with its add-task CTA. */
export const Empty: Story = { args: { tasks: [] } };

/** Long-press → multi-select: check circles on every row, the bulk action bar. */
export const MultiSelect: Story = {
  args: { initialSelection: ['task-garage', 'task-insurance'] },
};

/** Archiving tasks that earned stars warns first (the stars go too). */
export const ArchiveWarning: Story = {
  args: { initialSelection: ['task-insurance'], initialDialog: 'archive' },
};

/** Recycle bin tab: archived + cut-loose rows, each with Restore. */
export const RecycleBin: Story = {
  args: { tasks: BIN_TASKS, initialTab: 'bin' },
};

/** Deleting from the bin is permanent, so it always confirms. */
export const DeleteConfirm: Story = {
  args: {
    tasks: BIN_TASKS,
    initialTab: 'bin',
    initialSelection: ['task-notes'],
    initialDialog: 'delete',
  },
};

/** An empty recycle bin. */
export const EmptyBin: Story = {
  args: { tasks: ACTIVE_TASKS, initialTab: 'bin' },
};
