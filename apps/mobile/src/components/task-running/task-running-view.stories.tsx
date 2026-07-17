import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { makeTask } from '@/components/card-stack/task-card.stories';
import type { BreakdownController } from '@/hooks/use-breakdown';
import { makeSubtask } from './subtask-list.stories';
import { TaskRunningView } from './task-running-view';

/** Inert controller fixture — stories must never hit the network. */
function makeBreakdown(overrides: Partial<BreakdownController> = {}): BreakdownController {
  return {
    state: 'idle',
    steps: [],
    mode: 'first_steps',
    request: () => undefined,
    retry: () => undefined,
    accept: () => undefined,
    reject: () => undefined,
    ...overrides,
  };
}

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

/** Story 6.3 — accepted breakdown: live subtask list above the notes. */
export const WithSubtasks: Story = {
  args: {
    task: makeTask({
      id: 'task-running-subtasks',
      title: 'Sort the paperwork mountain',
      status: 'in_progress',
    }),
    onDone: () => {},
    onCutLoose: () => {},
    onHelp: () => {},
    breakdown: makeBreakdown(),
    subtasks: [
      makeSubtask({ id: 'st-1', title: 'Do just the first two minutes', completed: true }),
      makeSubtask({ id: 'st-2', title: 'Set a 10-minute timer and keep going', orderIndex: 1 }),
    ],
    onToggleSubtask: () => {},
    onDeleteSubtask: () => {},
  },
};

/** Story 6.3 — proposal in flight: the subtask area shows the pending steps. */
export const WithProposal: Story = {
  args: {
    task: makeTask({
      id: 'task-running-proposal',
      title: 'Sort the paperwork mountain',
      status: 'in_progress',
    }),
    onDone: () => {},
    onCutLoose: () => {},
    breakdown: makeBreakdown({
      state: 'proposal',
      steps: [
        'Get everything you need for "Sort the paperwork mountain" in one place',
        'Do just the first two minutes',
        'Set a 10-minute timer and keep going',
      ],
    }),
  },
};
