import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import {
  MICRO_TASK_SKIP_THRESHOLD,
  type TaskContext,
  type TaskData,
  type TaskSize,
} from '@one-down/shared';

import { makeTask } from '@/components/card-stack/task-card.stories';
import {
  assignBadges,
  attentionContexts,
  availableContexts,
  curateTasks,
} from '@/services/curation';
import { isTopOfDeck, potentialStars } from '@/services/star-calculator';

import { HomeScreen } from './home-screen';

const DAY = 24 * 60 * 60 * 1000;
/** Relative to now, so deadline copy and bonus windows stay live in the canvas. */
const inDays = (days: number) => new Date(Date.now() + days * DAY);

const DECK: TaskData[] = [
  makeTask({ id: 'plants', title: 'Water the plants', size: 'quick_win', contexts: '["home"]' }),
  makeTask({
    id: 'dentist',
    title: 'Book dentist appointment',
    size: 'quick_win',
    contexts: '["phone"]',
    deadline: inDays(2),
  }),
  makeTask({
    id: 'passport',
    title: 'Renew passport',
    size: 'big_time',
    contexts: '["laptop","internet"]',
    deadline: inDays(12),
  }),
  makeTask({ id: 'garage', title: 'Sort out the garage', size: 'big_time', contexts: '["home"]' }),
  makeTask({ id: 'plumber', title: 'Email the plumber', contexts: '["laptop","internet"]' }),
];

/** The deck with an AI-parsed task still waiting on a check (triage entry shows). */
const DECK_WITH_CHECKS: TaskData[] = [
  ...DECK,
  makeTask({
    id: 'form',
    title: 'Send the urgent form back',
    hasCheckNeeded: true,
    reviewFlags: JSON.stringify({ missingDeadline: true }),
  }),
];

/** Top card skipped past the threshold — the avoided-task nudge appears under it. */
const DECK_WITH_AVOIDED: TaskData[] = [
  makeTask({
    id: 'boiler',
    title: 'Book the boiler service',
    size: 'quick_win',
    contexts: '["phone"]',
    skipCount: MICRO_TASK_SKIP_THRESHOLD + 1,
    deadline: inDays(1),
  }),
  ...DECK.slice(2),
];

const ALL_DONE: TaskData[] = DECK.map((task) => ({ ...task, status: 'completed' as const }));

const NO_OFFERS: ReadonlyMap<string, number> = new Map();
const noop = () => {};
const noopAsync = async () => {};

/**
 * Home with its UI state held locally (seeded from args) and the REAL
 * curation, badge and context logic from src/services — so on the canvas
 * the filters re-curate the deck, the pencil opens the card back, the
 * context bar opens the "Right now" sheet and + opens quick add, just as in
 * the app. Task writes are no-ops.
 */
function InteractiveHome({
  tasks,
  initialContexts = [],
  initialMode = null,
  initialSheetOpen = false,
  initialCardBack = null,
  initialQuickAdd = false,
}: {
  tasks: TaskData[];
  initialContexts?: TaskContext[];
  initialMode?: TaskSize | null;
  initialSheetOpen?: boolean;
  initialCardBack?: string | null;
  initialQuickAdd?: boolean;
}) {
  const [activeContexts, setActiveContexts] = useState(initialContexts);
  const [mode, setMode] = useState(initialMode);
  const [sheetOpen, setSheetOpen] = useState(initialSheetOpen);
  const [cardBackId, setCardBackId] = useState(initialCardBack);
  const [quickAddOpen, setQuickAddOpen] = useState(initialQuickAdd);

  const now = useMemo(() => new Date(), []);
  const curated = useMemo(
    () => curateTasks(tasks, { contexts: activeContexts, size: mode }, { now, seed: 7 }),
    [tasks, activeContexts, mode, now],
  );
  const badges = useMemo(() => assignBadges(tasks, NO_OFFERS, now), [tasks, now]);
  const cardBackTask = cardBackId ? (tasks.find((task) => task.id === cardBackId) ?? null) : null;
  const top = curated[0];

  return (
    <HomeScreen
      starTotals={{ total: 42, today: 5 }}
      bankedStars={0}
      onListPress={noop}
      onStarPress={noop}
      onSettingsPress={noop}
      activeContexts={activeContexts}
      attentionContexts={attentionContexts(tasks, NO_OFFERS, now, activeContexts)}
      availableContexts={availableContexts(tasks)}
      mode={mode}
      onToggleContext={(context) =>
        setActiveContexts((previous) =>
          previous.includes(context)
            ? previous.filter((c) => c !== context)
            : [...previous, context],
        )
      }
      onSetMode={setMode}
      onClearFilters={() => {
        setActiveContexts([]);
        setMode(null);
      }}
      contextSheetOpen={sheetOpen}
      onExpandContextSheet={() => setSheetOpen(true)}
      onCollapseContextSheet={() => setSheetOpen(false)}
      scheme="light"
      hasTasks={tasks.length > 0}
      curated={curated}
      getStarValue={potentialStars}
      getBadge={(task) => badges.get(task.id) ?? null}
      getTopOfDeck={(task) => !badges.has(task.id) && isTopOfDeck(task, now)}
      onCardPress={noop}
      onEditPress={(task) => setCardBackId(task.id)}
      onReviewPress={noop}
      onSwipe={noop}
      onTopChange={noop}
      nudge={{
        visible:
          top !== undefined &&
          top.status === 'pending' &&
          top.skipCount >= MICRO_TASK_SKIP_THRESHOLD,
        state: 'idle',
        onGo: noop,
        onRetry: noop,
        onKeep: noop,
        onCutLoose: noop,
      }}
      onAddPress={() => setQuickAddOpen(true)}
      onBrainDumpPress={noop}
      triageCount={tasks.filter((task) => task.hasCheckNeeded).length}
      onTriagePress={noop}
      cardBack={
        cardBackTask
          ? {
              task: cardBackTask,
              onPatch: noop,
              onDismiss: () => setCardBackId(null),
              onStart: () => setCardBackId(null),
              onCutLoose: () => setCardBackId(null),
              onKeep: noop,
              onConfirm: noop,
              onConfirmAll: noop,
            }
          : null
      }
      quickAdd={{
        isOpen: quickAddOpen,
        onClose: () => setQuickAddOpen(false),
        onSubmit: noopAsync,
      }}
    />
  );
}

const meta = {
  title: 'screens/Home',
  component: InteractiveHome,
  args: { tasks: DECK },
} satisfies Meta<typeof InteractiveHome>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The everyday home: filters, the curated deck, standing actions. */
export const Stack: Story = {};

/** A brand-new user: nothing captured yet. */
export const Empty: Story = { args: { tasks: [] } };

/** Everything done or cut loose — achievement framing, not "no tasks". */
export const AllClear: Story = { args: { tasks: ALL_DONE } };

/** Filters that match nothing: tasks exist, so the copy offers "Show all tasks". */
export const FilteredOut: Story = {
  args: { initialContexts: ['phone'], initialMode: 'big_time' },
};

/** The "Right now" context sheet expanded over the blurred deck. */
export const RightNowSheet: Story = {
  args: { initialSheetOpen: true, initialContexts: ['home', 'phone'] },
};

/** The pencil flipped the top card: its editable back over the deck. */
export const CardBackOpen: Story = { args: { initialCardBack: 'plants' } };

/** Quick add over home, typing — the keyboard is up. */
export const QuickAdd: Story = {
  args: { initialQuickAdd: true },
  parameters: { canvas: { keyboard: true } },
};

/** An AI-parsed task needs a check: the dashed triage entry joins the actions. */
export const TriageWaiting: Story = { args: { tasks: DECK_WITH_CHECKS } };

/** The top card keeps getting skipped: the health nudge sits under it. */
export const AvoidedTaskNudge: Story = { args: { tasks: DECK_WITH_AVOIDED } };
