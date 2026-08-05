import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { StepsEditor } from './steps-editor';
import { makeSubtask } from './subtask-list.stories';

const meta = {
  title: 'task-running/StepsEditor',
  component: StepsEditor,
  args: {
    edits: {
      rename: () => undefined,
      remove: () => undefined,
      add: () => undefined,
      reorder: () => undefined,
    },
    onDone: () => undefined,
  },
  decorators: [
    (Story) => (
      <Box className="bg-background-50 p-6">
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof StepsEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

/** D4 (05a) — edit mode: grips, bins, dashed Add a step, reorder hint. */
export const EditingSteps: Story = {
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
        source: 'manual',
      }),
    ],
  },
};
