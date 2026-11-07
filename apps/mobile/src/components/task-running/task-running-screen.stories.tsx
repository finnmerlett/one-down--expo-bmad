import type { Meta, StoryObj } from '@storybook/react';

import type { SubtaskData, TaskData } from '@one-down/shared';

import { makeTask } from '@/components/card-stack/task-card.stories';
import type { StepActionsController } from '@/hooks/use-step-actions';
import { bankedForCount, taskValue } from '@/services/star-calculator';

import { makeSubtask } from './subtask-list.stories';
import { TaskRunningScreen } from './task-running-screen';
import { makeStepActions } from './task-running-view.stories';

const TWO_STEPS: SubtaskData[] = [
  makeSubtask({ id: 'st-1', title: 'Do just the first two minutes', completed: true }),
  makeSubtask({ id: 'st-2', title: 'Set a 10-minute timer and keep going', orderIndex: 1 }),
];

const THREE_STEPS: SubtaskData[] = [
  makeSubtask({
    id: 'st-1',
    title: 'Get everything you need in one place',
    completed: true,
    orderIndex: 0,
  }),
  makeSubtask({ id: 'st-2', title: 'Do just the first two minutes', orderIndex: 1 }),
  makeSubtask({
    id: 'st-3',
    title: 'Set a 10-minute timer and keep going',
    orderIndex: 2,
    source: 'manual',
  }),
];

/** Past the 3-row window: the list collapses around the current step. */
const LONG_STEPS: SubtaskData[] = [
  'Clear the doorway',
  'Pull everything off the left shelf',
  'Bin anything broken',
  'Box up the donations',
  'Sweep the floor',
  'Put the keepers back',
].map((title, index) =>
  makeSubtask({ id: `st-${index + 1}`, title, orderIndex: index, completed: index < 2 }),
);

const noop = () => {};
const STEP_EDITS = { rename: noop, remove: noop, add: noop, reorder: noop };

/**
 * The working screen with the REAL star-bucket maths (prize + banked from
 * src/services/star-calculator), so the header reads exactly as in the app.
 * The route holds no UI state of its own — the view's (notes expanded, steps
 * edit mode, change box) is seeded through the `initial*` args and then
 * lives in TaskRunningView, so the canvas stays clickable/typable. Data
 * writes are no-ops.
 */
function InteractiveTaskRunning({
  task,
  subtasks = [],
  stepActions = makeStepActions(),
  initialNotesOpen = false,
  initialEditMode = false,
  initialChangeOpen = false,
}: {
  task: TaskData;
  subtasks?: SubtaskData[];
  stepActions?: StepActionsController;
  initialNotesOpen?: boolean;
  initialEditMode?: boolean;
  initialChangeOpen?: boolean;
}) {
  return (
    <TaskRunningScreen
      task={task}
      prize={taskValue(task)}
      banked={bankedForCount(task, subtasks.filter((subtask) => subtask.completed).length)}
      onBack={noop}
      onEditPress={noop}
      onPatch={noop}
      onDone={noop}
      onCutLoose={noop}
      subtasks={subtasks}
      onToggleSubtask={noop}
      stepActions={stepActions}
      stepEdits={STEP_EDITS}
      initialNotesOpen={initialNotesOpen}
      initialEditMode={initialEditMode}
      initialChangeOpen={initialChangeOpen}
    />
  );
}

const meta = {
  title: 'screens/TaskRunning',
  component: InteractiveTaskRunning,
  args: {
    task: makeTask({ id: 'task-running-bare', title: 'Water the plants', status: 'in_progress' }),
  },
} satisfies Meta<typeof InteractiveTaskRunning>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Just a title: no steps yet, so the AI row offers Get first steps. */
export const Bare: Story = {};

/** Description under the title and the notes expanded, as the user left them. */
export const WithDetailsAndNotes: Story = {
  args: {
    task: makeTask({
      id: 'task-running-full',
      title: 'Sort out the garage',
      details: 'At least clear a path to the freezer',
      notes: 'Shelves are up, boxes next',
      size: 'big_time',
      status: 'in_progress',
    }),
    initialNotesOpen: true,
  },
};

/** Typing a note: the step list gives up the room (frame 05f). */
export const TypingNotes: Story = {
  args: {
    task: makeTask({
      id: 'task-running-typing',
      title: 'Sort the paperwork mountain',
      notes: 'Bank letters in the blue folder',
      status: 'in_progress',
    }),
    subtasks: TWO_STEPS,
    initialNotesOpen: true,
  },
  parameters: { canvas: { keyboard: true } },
};

/** D4 (05b): steps under the title, one done so stars are banked. */
export const WithSteps: Story = {
  args: {
    task: makeTask({
      id: 'task-running-subtasks',
      title: 'Sort the paperwork mountain',
      status: 'in_progress',
    }),
    subtasks: TWO_STEPS,
  },
};

/** A long breakdown: the 3-row window around the current step, with All. */
export const LongStepList: Story = {
  args: {
    task: makeTask({
      id: 'task-running-long',
      title: 'Sort out the garage',
      size: 'big_time',
      status: 'in_progress',
    }),
    subtasks: LONG_STEPS,
  },
};

/** D4 (05a): steps edit mode — grips, bins, dashed Add a step. */
export const EditingSteps: Story = {
  args: {
    task: makeTask({
      id: 'task-running-editing',
      title: 'Sort the paperwork mountain',
      status: 'in_progress',
    }),
    subtasks: THREE_STEPS,
    initialEditMode: true,
  },
};

/** D4: Change opened the dashed WHAT SHOULD BE DIFFERENT box. */
export const ChangeBoxOpen: Story = {
  args: {
    task: makeTask({
      id: 'task-running-change',
      title: 'Sort the paperwork mountain',
      status: 'in_progress',
    }),
    subtasks: TWO_STEPS,
    initialChangeOpen: true,
  },
  parameters: { canvas: { keyboard: true } },
};

/** First steps requested from nothing: spinner + Working in the button. */
export const GettingFirstSteps: Story = {
  args: {
    task: makeTask({ id: 'task-running-first', title: 'Water the plants', status: 'in_progress' }),
    stepActions: makeStepActions({ state: 'working', kind: 'more' }),
  },
};

/** D4 (05d): Change these submitted — spinner + Working, rows at 45%. */
export const ChangeWorking: Story = {
  args: {
    task: makeTask({
      id: 'task-running-working',
      title: 'Sort the paperwork mountain',
      status: 'in_progress',
    }),
    subtasks: TWO_STEPS,
    stepActions: makeStepActions({ state: 'working', kind: 'change' }),
  },
};

/** D4 (05e): the result landed — report line + Undo, NEW tags on the rows. */
export const AfterChange: Story = {
  args: {
    task: makeTask({ id: 'task-running-after', title: 'Repot the plants', status: 'in_progress' }),
    subtasks: [
      makeSubtask({ id: 'st-1', title: 'Buy compost and pots', completed: true }),
      makeSubtask({ id: 'st-2', title: 'Pick a weekend slot next week', orderIndex: 1 }),
      makeSubtask({ id: 'st-3', title: 'Add “Repot plants” and a reminder', orderIndex: 2 }),
    ],
    stepActions: makeStepActions({
      report: {
        kind: 'change',
        added: 1,
        changed: 1,
        newTitles: new Set(['Pick a weekend slot next week', 'Add “Repot plants” and a reminder']),
      },
    }),
  },
};

/** D4: the request failed — quiet inline line + Try again. */
export const ActionFailed: Story = {
  args: {
    task: makeTask({ id: 'task-running-failed', title: 'Water the plants', status: 'in_progress' }),
    stepActions: makeStepActions({ state: 'error', kind: 'more', errorReason: 'network' }),
  },
};
