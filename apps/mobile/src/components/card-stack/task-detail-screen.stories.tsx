import type { Meta, StoryObj } from '@storybook/react';

import type { TaskData } from '@one-down/shared';

import { makeTask } from './task-card.stories';
import { TaskDetailScreen } from './task-detail-screen';

const DAY = 24 * 60 * 60 * 1000;
/** Relative to now, so deadline copy stays live in the canvas. */
const inDays = (days: number) => new Date(Date.now() + days * DAY);

const FULL_TASK = makeTask({
  id: 'task-detail-full',
  title: 'Book dentist appointment',
  details: 'Ask about the wisdom tooth while at it',
  size: 'quick_win',
  contexts: '["home","phone"]',
  deadline: inDays(5),
});

const noop = () => {};

/**
 * The task detail with every callback inert. The route holds no UI state of
 * its own — the drafts, date picker and ticks all live inside CardBack, so
 * the canvas copy is still typable and clickable. Data writes are no-ops.
 */
function InteractiveTaskDetail({
  task,
  frameless = false,
}: {
  task: TaskData;
  frameless?: boolean;
}) {
  return (
    <TaskDetailScreen
      task={task}
      frameless={frameless}
      onPatch={noop}
      onConfirm={noop}
      onConfirmAll={noop}
      onKeep={noop}
      onClose={noop}
      onStart={noop}
      onCutLoose={noop}
    />
  );
}

const meta = {
  title: 'screens/TaskDetail',
  component: InteractiveTaskDetail,
  args: { task: FULL_TASK },
} satisfies Meta<typeof InteractiveTaskDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pencil on a stack card: the editor as a floating card, every field set. */
export const FromCard: Story = {};

/** Pencil on the working screen (`?flat=1`): a plain full-bleed editor. */
export const FromWorkingScreen: Story = { args: { frameless: true } };

/** Only a title — every group waits to be filled in. */
export const Minimal: Story = {
  args: { task: makeTask({ id: 'task-detail-minimal', title: 'Water the plants' }) },
};

/** Rewriting the title and details — the keyboard is up. */
export const EditingText: Story = {
  args: { frameless: true },
  parameters: { canvas: { keyboard: true } },
};

/** v1.5 F-treatment (frame 06): AI guesses — WE GUESSED tags, ticks, Confirm all. */
export const NeedsCheck: Story = {
  args: {
    task: makeTask({
      id: 'task-detail-flagged',
      title: 'Call the dentist soon',
      size: 'quick_win',
      contexts: '["phone"]',
      deadline: inDays(3),
      hasCheckNeeded: true,
      reviewFlags: JSON.stringify({ inferred: ['size', 'contexts', 'deadline'] }),
    }),
  },
};

/** NOTHING TO GO ON (frame 06 variant): the dashed missing-deadline row. */
export const MissingDeadline: Story = {
  args: {
    task: makeTask({
      id: 'task-detail-missing-deadline',
      title: 'Send the urgent form back',
      hasCheckNeeded: true,
      reviewFlags: JSON.stringify({ missingDeadline: true }),
    }),
  },
};

/** Story 7.2: an avoided task — the health prompt offers break down / keep / cut loose. */
export const AvoidedTask: Story = {
  args: {
    task: makeTask({
      id: 'task-detail-health',
      title: 'Book the boiler service',
      skipCount: 6,
      skipWindowStartedAt: new Date(Date.now() - 2 * DAY),
    }),
  },
};
