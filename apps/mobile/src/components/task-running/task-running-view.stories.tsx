import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { makeTask } from '@/components/card-stack/task-card.stories';
import { TaskRunningView } from './task-running-view';

const meta = {
  title: 'task-running/TaskRunningView',
  component: TaskRunningView,
  decorators: [
    (Story) => (
      <Box className="flex-1 bg-background-50 pt-4" style={{ maxHeight: 640 }}>
        <Story />
      </Box>
    ),
  ],
  args: {
    onPatch: () => {},
  },
} satisfies Meta<typeof TaskRunningView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDetailsAndNotes: Story = {
  args: {
    task: makeTask({
      id: 'task-running-full',
      title: 'Sort out the garage',
      details: 'At least clear a path to the freezer',
      notes: 'Shelves are up, boxes next',
      status: 'in_progress',
    }),
  },
};

export const Bare: Story = {
  args: {
    task: makeTask({
      id: 'task-running-bare',
      title: 'Water the plants',
      status: 'in_progress',
    }),
  },
};

/**
 * Stories 2.3/2.4 — Done and Cut loose wired, as the running route renders
 * it; only "Help me with this" (Epic 6) remains a disabled placeholder.
 */
export const AllActionsEnabled: Story = {
  args: {
    task: makeTask({
      id: 'task-running-done',
      title: 'Sort out the garage',
      status: 'in_progress',
    }),
    onDone: () => {},
    onCutLoose: () => {},
  },
};
