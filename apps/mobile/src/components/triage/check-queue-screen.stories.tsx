import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import type { TaskData } from '@one-down/shared';

import { makeTask } from '@/components/card-stack/task-card.stories';

import { CheckQueueScreen } from './check-queue-screen';

/** A realistic queue of AI-parsed tasks, each carrying review items. */
const QUEUE: TaskData[] = [
  makeTask({
    id: 'passport',
    title: 'Renew passport',
    details: 'Before the trip in March',
    size: 'big_time',
    contexts: '["laptop","internet"]',
    hasCheckNeeded: true,
    reviewFlags: JSON.stringify({ inferred: ['size', 'contexts'], missingDeadline: true }),
  }),
  makeTask({
    id: 'dentist',
    title: 'Call the dentist about the crown',
    size: 'quick_win',
    contexts: '["phone"]',
    hasCheckNeeded: true,
    reviewFlags: JSON.stringify({ inferred: ['size'] }),
  }),
  makeTask({
    id: 'garage',
    title: 'Clean out the garage',
    contexts: '["home"]',
    hasCheckNeeded: true,
    reviewFlags: JSON.stringify({ inferred: ['contexts'] }),
  }),
];

const noop = () => {};

/**
 * The check queue with its session state (queue order, handled count) held
 * locally, seeded from args — so on the canvas `Save and next` advances the
 * rail, `Skip this one` sinks the card to the end and the bin removes it,
 * ending on Queue clear as in the app. Task writes are no-ops.
 */
function InteractiveCheckQueue({
  tasks,
  initialHandled = 0,
}: {
  tasks: TaskData[];
  /** Cards already handled this session (they count toward the total). */
  initialHandled?: number;
}) {
  const [queue, setQueue] = useState(tasks);
  const [handled, setHandled] = useState(initialHandled);
  // Fixed on entry, like the route: saving never shrinks `n / total`.
  const totalRef = useRef(initialHandled + tasks.length);
  const total = Math.max(totalRef.current, handled + queue.length);
  const position = Math.min(handled + 1, Math.max(total, 1));
  const leave = (task: TaskData) => {
    setQueue((previous) => previous.filter((candidate) => candidate.id !== task.id));
    setHandled((previous) => previous + 1);
  };

  return (
    <CheckQueueScreen
      current={queue[0] ?? null}
      position={position}
      total={total}
      handledCount={handled}
      onSave={leave}
      onSkip={(task) =>
        setQueue((previous) => [...previous.filter((candidate) => candidate !== task), task])
      }
      onDelete={leave}
      onBack={noop}
    />
  );
}

const meta = {
  title: 'screens/CheckQueue',
  component: InteractiveCheckQueue,
  args: { tasks: QUEUE },
} satisfies Meta<typeof InteractiveCheckQueue>;

export default meta;
type Story = StoryObj<typeof meta>;

/** First card of three: guessed size + contexts, and a deadline with nothing to go on. */
export const FirstCard: Story = {};

/** Rewording the card's title in place — the keyboard is up. */
export const EditingCard: Story = {
  parameters: { canvas: { keyboard: true } },
};

/** Two cards in: the rail fills by handled count, `3 / 4` in the header. */
export const MidQueue: Story = {
  args: { tasks: QUEUE.slice(1), initialHandled: 2 },
};

/** Last card left: one bar to go before the +5. */
export const LastCard: Story = {
  args: { tasks: QUEUE.slice(2), initialHandled: 3 },
};

/** Every card handled: a full rail and the Queue clear screen. */
export const QueueClear: Story = {
  args: { tasks: [], initialHandled: 3 },
};

/** Opened with nothing flagged: no counter, no rail, straight to Queue clear. */
export const NothingToCheck: Story = {
  args: { tasks: [] },
};
