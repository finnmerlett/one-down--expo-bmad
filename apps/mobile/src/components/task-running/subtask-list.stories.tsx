import type { Meta, StoryObj } from '@storybook/react';
import type { SubtaskData } from '@one-down/shared';

import { Box } from '@/components/ui/box';

import { SubtaskList } from './subtask-list';

export function makeSubtask(overrides: Partial<SubtaskData> = {}): SubtaskData {
  return {
    id: 'subtask-1',
    taskId: 'task-1',
    title: 'Do just the first two minutes',
    completed: false,
    orderIndex: 0,
    source: 'ai',
    createdAt: new Date('2026-07-01T10:00:00Z'),
    updatedAt: new Date('2026-07-01T10:00:00Z'),
    ...overrides,
  };
}

const meta = {
  title: 'task-running/SubtaskList',
  component: SubtaskList,
  args: {
    onToggle: () => undefined,
  },
  decorators: [
    (Story) => (
      <Box className="bg-background-0 p-6">
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof SubtaskList>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No subtasks — the list renders nothing (the view shows the action row alone). */
export const Empty: Story = {
  args: { subtasks: [] },
};

export const MixedCompletion: Story = {
  args: {
    subtasks: [
      makeSubtask({
        id: 'subtask-1',
        title: 'Get everything you need in one place',
        completed: true,
        orderIndex: 0,
      }),
      makeSubtask({ id: 'subtask-2', title: 'Do just the first two minutes', orderIndex: 1 }),
      makeSubtask({
        id: 'subtask-3',
        title: 'Set a 10-minute timer and keep going',
        orderIndex: 2,
        source: 'micro',
      }),
    ],
  },
};

/** D4 (05e) — after an AI action: report line with Undo, NEW tags on the
 *  changed rows, Edit chip on the right. */
export const AfterAiChange: Story = {
  args: {
    subtasks: [
      makeSubtask({
        id: 'subtask-1',
        title: 'Get everything you need in one place',
        completed: true,
        orderIndex: 0,
      }),
      makeSubtask({ id: 'subtask-2', title: 'Pick a weekend slot next week', orderIndex: 1 }),
      makeSubtask({
        id: 'subtask-3',
        title: 'Add “Repot plants” and a reminder',
        orderIndex: 2,
      }),
    ],
    report: {
      kind: 'change',
      added: 1,
      changed: 1,
      newTitles: new Set(['Pick a weekend slot next week', 'Add “Repot plants” and a reminder']),
    },
    onUndo: () => undefined,
    onEditSteps: () => undefined,
  },
};

/** D4 (05d) — an AI action in flight: the rows drop to 45%. */
export const WorkingFaded: Story = {
  args: {
    subtasks: [
      makeSubtask({ id: 'subtask-1', title: 'Do just the first two minutes', completed: true }),
      makeSubtask({
        id: 'subtask-2',
        title: 'Set a 10-minute timer and keep going',
        orderIndex: 1,
      }),
    ],
    faded: true,
  },
};
