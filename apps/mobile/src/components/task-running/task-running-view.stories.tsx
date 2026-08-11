import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { makeTask } from '@/components/card-stack/task-card.stories';
import type { StepActionsController } from '@/hooks/use-step-actions';
import { makeSubtask } from './subtask-list.stories';
import { TaskRunningView } from './task-running-view';

/** Inert controller fixture — stories must never hit the network. */
export function makeStepActions(
  overrides: Partial<StepActionsController> = {},
): StepActionsController {
  const base: StepActionsController = {
    state: 'idle',
    kind: null,
    errorReason: null,
    report: null,
    getMoreSteps: () => undefined,
    changeThese: () => undefined,
    retry: () => undefined,
    undo: () => undefined,
    clearReport: () => undefined,
  };
  // exactOptionalPropertyTypes: the Partial spread widens fields with
  // `| undefined`; every override here is always fully-formed.
  return { ...base, ...overrides } as StepActionsController;
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
    stepActions: makeStepActions(),
  },
};

export const Bare: Story = {
  args: {
    task: makeTask({
      id: 'task-running-bare',
      title: 'Water the plants',
      status: 'in_progress',
    }),
    stepActions: makeStepActions(),
  },
};

/** Stories 2.3/2.4 — Done and Cut loose wired, as the running route renders it. */
export const AllActionsEnabled: Story = {
  args: {
    task: makeTask({
      id: 'task-running-done',
      title: 'Sort out the garage',
      status: 'in_progress',
    }),
    onDone: () => {},
    onCutLoose: () => {},
    stepActions: makeStepActions(),
  },
};

/** D4 (05b) — steps present: Change these + More steps under the list. */
export const WithSubtasks: Story = {
  args: {
    task: makeTask({
      id: 'task-running-subtasks',
      title: 'Sort the paperwork mountain',
      status: 'in_progress',
    }),
    onDone: () => {},
    onCutLoose: () => {},
    stepActions: makeStepActions(),
    subtasks: [
      makeSubtask({ id: 'st-1', title: 'Do just the first two minutes', completed: true }),
      makeSubtask({ id: 'st-2', title: 'Set a 10-minute timer and keep going', orderIndex: 1 }),
    ],
    onToggleSubtask: () => {},
  },
};

/** D4 (05d) — Change these submitted: spinner + Working, rows at 45%. */
export const ChangeWorking: Story = {
  args: {
    task: makeTask({
      id: 'task-running-working',
      title: 'Sort the paperwork mountain',
      status: 'in_progress',
    }),
    onDone: () => {},
    onCutLoose: () => {},
    stepActions: makeStepActions({ state: 'working', kind: 'change' }),
    subtasks: [
      makeSubtask({ id: 'st-1', title: 'Do just the first two minutes', completed: true }),
      makeSubtask({ id: 'st-2', title: 'Set a 10-minute timer and keep going', orderIndex: 1 }),
    ],
  },
};

/** D4 (05e) — the result landed: report line + Undo, NEW tags on the rows. */
export const AfterChange: Story = {
  args: {
    task: makeTask({
      id: 'task-running-after',
      title: 'Repot the plants',
      status: 'in_progress',
    }),
    onDone: () => {},
    onCutLoose: () => {},
    stepActions: makeStepActions({
      report: {
        kind: 'change',
        added: 1,
        changed: 1,
        newTitles: new Set(['Pick a weekend slot next week', 'Add “Repot plants” and a reminder']),
      },
    }),
    subtasks: [
      makeSubtask({ id: 'st-1', title: 'Buy compost and pots', completed: true }),
      makeSubtask({ id: 'st-2', title: 'Pick a weekend slot next week', orderIndex: 1 }),
      makeSubtask({ id: 'st-3', title: 'Add “Repot plants” and a reminder', orderIndex: 2 }),
    ],
  },
};

/** D4 — the request failed: quiet inline line + Try again. */
export const ActionFailed: Story = {
  args: {
    task: makeTask({
      id: 'task-running-failed',
      title: 'Water the plants',
      status: 'in_progress',
    }),
    stepActions: makeStepActions({ state: 'error', kind: 'more', errorReason: 'network' }),
  },
};
