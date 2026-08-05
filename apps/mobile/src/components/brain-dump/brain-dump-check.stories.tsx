import type { Meta, StoryObj } from '@storybook/react';
import type { ParsedTaskDraft } from '@one-down/shared';

import { Box } from '@/components/ui/box';

import { BrainDumpCheck } from './brain-dump-check';

export function makeDraft(overrides: Partial<ParsedTaskDraft> = {}): ParsedTaskDraft {
  return {
    title: 'Call the dentist',
    details: null,
    size: 'quick_win',
    contexts: ['phone'],
    deadline: null,
    timeSensitive: false,
    evidence: ['call the dentist about the crown'],
    ...overrides,
  };
}

const meta = {
  title: 'brain-dump/BrainDumpCheck',
  component: BrainDumpCheck,
  args: {
    onRename: () => undefined,
    onDrop: () => undefined,
    onPromote: () => undefined,
    onChangeThese: () => undefined,
    onAddAll: () => undefined,
    onBackToDump: () => undefined,
  },
  decorators: [
    (Story) => (
      <Box className="flex-1 bg-background-100 pt-3" style={{ maxHeight: 640 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof BrainDumpCheck>;

export default meta;

type Story = StoryObj<typeof meta>;

/** D6 (07f) — the gate: task boxes with evidence quotes, one unclaimed
 *  dashed row with its + promote button, footer counts. */
export const CheckThese: Story = {
  args: {
    tasks: [
      makeDraft(),
      makeDraft({
        title: 'Clean out the garage',
        contexts: ['home'],
        evidence: ['clean out the garage', 'the shelves need to go up first'],
      }),
    ],
    unclaimed: ['maybe something about the loft'],
  },
};

/** D6 (07h) — a re-parse in flight: boxes fade, Change these spins. */
export const Reparsing: Story = {
  args: {
    tasks: [makeDraft()],
    unclaimed: [],
    working: true,
  },
};
