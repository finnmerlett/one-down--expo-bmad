import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import type { BrainDumpCheckState } from '@/services/brain-dump-draft';

import { makeDraft } from './brain-dump-check.stories';
import type { BrainDumpState } from './brain-dump-input';
import { BrainDumpScreen } from './brain-dump-screen';

/** A realistic mid-week dump — the source every parsed box quotes from. */
const DUMP_TEXT = [
  'call the dentist about the crown',
  'clean out the garage, the shelves need to go up first',
  'renew passport before the trip in march!!',
  'maybe something about the loft',
].join('\n');

/** What the parse hands back for DUMP_TEXT: three boxes, one unclaimed line. */
const PARSED: BrainDumpCheckState = {
  tasks: [
    makeDraft(),
    makeDraft({
      title: 'Clean out the garage',
      size: 'big_time',
      contexts: ['home'],
      evidence: ['clean out the garage', 'the shelves need to go up first'],
    }),
    makeDraft({
      title: 'Renew passport',
      size: null,
      contexts: ['laptop', 'internet'],
      timeSensitive: true,
      evidence: ['renew passport before the trip in march!!'],
    }),
  ],
  unclaimed: ['maybe something about the loft'],
};

/** PARSED after promoting the unclaimed line: an empty-title box, caret in it. */
const PROMOTED: BrainDumpCheckState = {
  tasks: [
    ...PARSED.tasks,
    makeDraft({
      title: '',
      size: null,
      contexts: [],
      evidence: ['maybe something about the loft'],
    }),
  ],
  unclaimed: [],
};

const noop = () => {};

/**
 * Brain dump with its UI state (stage, text, parsed check) held locally,
 * seeded from args — so on the canvas you can type, Parse lands on the
 * fixture check, boxes reword / drop / promote, and `Back to the dump`
 * returns to the text, as in the app. Parsing and task writes are no-ops.
 */
function InteractiveBrainDump({
  initialState = 'idle',
  initialText = '',
  initialCheck = null,
  initialWorking = false,
  initialAutoEditIndex = null,
}: {
  initialState?: BrainDumpState;
  initialText?: string;
  initialCheck?: BrainDumpCheckState | null;
  initialWorking?: boolean;
  initialAutoEditIndex?: number | null;
}) {
  const [state, setState] = useState(initialState);
  const [text, setText] = useState(initialText);
  const [check, setCheck] = useState(initialCheck);
  const [autoEditIndex, setAutoEditIndex] = useState(initialAutoEditIndex);

  return (
    <BrainDumpScreen
      state={state}
      text={text}
      onChangeText={setText}
      onSubmit={() => {
        setState('idle');
        setCheck(PARSED);
      }}
      onQuickAddInstead={noop}
      check={check}
      working={initialWorking}
      autoEditIndex={autoEditIndex}
      onAutoEditHandled={() => setAutoEditIndex(null)}
      onRename={(index, title) =>
        setCheck((previous) =>
          previous
            ? {
                ...previous,
                tasks: previous.tasks.map((task, candidate) =>
                  candidate === index ? { ...task, title } : task,
                ),
              }
            : previous,
        )
      }
      onDrop={(index) =>
        setCheck((previous) => {
          const dropped = previous?.tasks[index];
          if (!previous || !dropped) return previous;
          return {
            tasks: previous.tasks.filter((_, candidate) => candidate !== index),
            unclaimed: [...previous.unclaimed, ...dropped.evidence],
          };
        })
      }
      onPromote={(line) =>
        setCheck((previous) => {
          if (!previous) return previous;
          setAutoEditIndex(previous.tasks.length);
          return {
            tasks: [
              ...previous.tasks,
              makeDraft({ title: '', size: null, contexts: [], evidence: [line] }),
            ],
            unclaimed: previous.unclaimed.filter((candidate) => candidate !== line),
          };
        })
      }
      onChangeThese={noop}
      onAddAll={noop}
      onBackToDump={() => setCheck(null)}
      onClose={noop}
    />
  );
}

const meta = {
  title: 'screens/BrainDump',
  component: InteractiveBrainDump,
} satisfies Meta<typeof InteractiveBrainDump>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fresh dump: empty textarea, Parse disabled, quick add offered below. */
export const Idle: Story = {};

/** Mid-dump with the keyboard up — only Parse rides above it. */
export const Typing: Story = {
  args: { initialText: DUMP_TEXT },
  parameters: { canvas: { keyboard: true } },
};

/** The quiet first second of a parse: input disabled, no spinner yet. */
export const Submitted: Story = {
  args: { initialText: DUMP_TEXT, initialState: 'submitted' },
};

/** Past 1s: the spinner fades in where the Parse button was. */
export const Parsing: Story = {
  args: { initialText: DUMP_TEXT, initialState: 'parsing' },
};

/** Past 4s: the "Taking a bit longer..." line joins the spinner. */
export const ParsingLong: Story = {
  args: { initialText: DUMP_TEXT, initialState: 'parsing_long' },
};

/** Parse failed offline: inline copy, retry kept, quick add offered. */
export const ParseError: Story = {
  args: { initialText: DUMP_TEXT, initialState: 'error' },
};

/** The gate: one box per parsed task with its quotes, an unclaimed line to promote. */
export const CheckThese: Story = {
  args: { initialText: DUMP_TEXT, initialCheck: PARSED },
};

/** `Change these` re-parse in flight: boxes fade, the button spins. */
export const Reparsing: Story = {
  args: { initialText: DUMP_TEXT, initialCheck: PARSED, initialWorking: true },
};

/** A promoted line lands as an empty-title box with the caret in its title. */
export const PromotedLine: Story = {
  args: { initialText: DUMP_TEXT, initialCheck: PROMOTED, initialAutoEditIndex: 3 },
  parameters: { canvas: { keyboard: true } },
};
