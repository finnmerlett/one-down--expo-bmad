import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { makeTask } from '@/components/card-stack/task-card.stories';
import type { AttentionRow } from '@/services/welcome-back';

import { TriageScreen } from './triage-screen';

/** One row per attention reason (as in the triage/TriageList stories). */
const ALL_REASONS: AttentionRow[] = [
  {
    task: makeTask({ id: 'task-due', title: 'Send the tax form' }),
    reason: 'deadline_passed',
  },
  {
    task: makeTask({ id: 'task-avoided', title: 'Reply to that email' }),
    reason: 'avoided',
  },
  {
    task: makeTask({ id: 'task-stale', title: 'Sort the filing cabinet' }),
    reason: 'stale',
  },
];

const noop = () => {};

/**
 * The triage screen with its rows held locally (seeded from args) — so on
 * the canvas Keep, Cut loose and Later each remove their row, just as the
 * route's session-local removals do, until "All caught up" shows. Data
 * writes, rewards and navigation are no-ops.
 */
function InteractiveTriage({ rows: initialRows }: { rows: AttentionRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const remove = (row: AttentionRow) =>
    setRows((previous) => previous.filter((candidate) => candidate.task.id !== row.task.id));
  return (
    <TriageScreen
      rows={rows}
      onKeep={remove}
      onCutLoose={remove}
      onLater={remove}
      onGoToDeck={noop}
    />
  );
}

const meta = {
  title: 'screens/Triage',
  component: InteractiveTriage,
  args: { rows: ALL_REASONS },
} satisfies Meta<typeof InteractiveTriage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** "What's up": one row per reason — deadline passed, avoided, stale. */
export const AllReasons: Story = {};

/** Nothing needs attention: "All caught up" with the CTA back to the deck. */
export const AllCaughtUp: Story = { args: { rows: [] } };
