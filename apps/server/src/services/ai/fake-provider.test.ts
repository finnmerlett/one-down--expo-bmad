import { describe, expect, it } from 'bun:test';

import { MAX_PARSED_TASKS } from '@one-down/shared';

import { createFakeProvider } from './fake-provider';

const provider = createFakeProvider();
const parse = (text: string) => provider.parseBrainDump(text);

/** Mirror of the provider's deadline rule — today/tomorrow at 18:00 local. */
function sixPmLocal(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(18, 0, 0, 0);
  return date.toISOString();
}

describe('fake provider segmentation', () => {
  it('splits on newlines, periods and semicolons, trimming and dropping empties', async () => {
    const drafts = await parse('Call mum.\n  Buy milk ; \n\nGather the paperwork.');

    expect(drafts.map((d) => d.title)).toEqual(['Call mum', 'Buy milk', 'Gather the paperwork']);
  });

  it('capitalizes only the first letter of each segment', async () => {
    const drafts = await parse('buy milk');

    expect(drafts[0]?.title).toBe('Buy milk');
  });

  it('returns no drafts for separator-only input', async () => {
    expect(await parse(' . ; \n ')).toEqual([]);
  });

  it('caps output at MAX_PARSED_TASKS segments', async () => {
    const text = Array.from({ length: 25 }, (_, i) => `item number ${i + 1}`).join(';');

    const drafts = await parse(text);

    expect(drafts).toHaveLength(MAX_PARSED_TASKS);
    expect(drafts[0]?.title).toBe('Item number 1');
    expect(drafts[19]?.title).toBe('Item number 20');
  });
});

describe('fake provider context rules (case-insensitive, first match wins)', () => {
  it.each([
    ['CALL the dentist about that thing', ['phone']],
    ['Text grandma back about the weekend', ['phone']],
    ['Ring the council about the bins', ['phone']],
    ['Email the landlord about the boiler', ['internet']],
    ['Renew the parking permit online somehow', ['internet']],
    ['Update the personal website bio section', ['internet']],
    ['Book a table for the birthday dinner', ['internet']],
    ['Buy a new umbrella before the storm', ['out_and_about']],
    ['Shop for a housewarming present', ['out_and_about']],
    ['Pick up the dry cleaning from the shop round the corner', ['out_and_about']],
    ['Clean behind the fridge at long last', ['home']],
    ['Tidy the hallway cupboard of doom', ['home']],
    ['Wash the gym kit before Thursday', ['home']],
    ['Fix the wobbly shelf in the bathroom', ['home']],
    ['Write the yearly self-assessment blurb', ['laptop']],
    ['Finish the quarterly report for finance', ['laptop']],
    ['Review the code from the new starter', ['laptop']],
    ['Gather the mountain of paperwork somewhere', []],
  ] as const)('%s → %j', async (text, contexts) => {
    const drafts = await parse(text);

    expect(drafts[0]?.contexts).toEqual([...contexts]);
  });

  it('applies only the FIRST matching rule when several keywords appear', async () => {
    // 'call' (phone) beats 'book' (internet); 'buy' (out_and_about) beats 'clean' (home)
    const drafts = await parse(
      'Call the venue to book a slot for the party\nBuy a new mop and clean the kitchen floor',
    );

    expect(drafts[0]?.contexts).toEqual(['phone']);
    expect(drafts[1]?.contexts).toEqual(['out_and_about']);
  });
});

describe('fake provider size rules', () => {
  it('marks segments of five words or fewer as quick_win', async () => {
    const drafts = await parse('Gather all the stray paperwork');

    expect(drafts[0]?.size).toBe('quick_win');
  });

  it('marks longer segments containing "quick" as quick_win', async () => {
    const drafts = await parse('Give the garden fence a quick lick of paint');

    expect(drafts[0]?.size).toBe('quick_win');
  });

  it.each([
    ['Plan the summer holiday route through the mountains'],
    ['Organise the overflowing garage into labelled boxes'],
    ['Organize the overflowing garage into labelled boxes'],
    ['Untangle the loft insulation project before winter arrives'],
  ] as const)('big_time keyword in a longer segment: %s', async (text) => {
    const drafts = await parse(text);

    expect(drafts[0]?.size).toBe('big_time');
  });

  it('quick_win wins over big_time when both rules match', async () => {
    const drafts = await parse('Make a quick outline of the kitchen renovation project');

    expect(drafts[0]?.size).toBe('quick_win');
  });

  it('leaves longer segments with no size keywords as null', async () => {
    const drafts = await parse('Gather the mountain of paperwork somewhere');

    expect(drafts[0]?.size).toBeNull();
  });
});

describe('fake provider deadline + timeSensitive rules', () => {
  it('resolves "today" to today 18:00 local and marks it time-sensitive', async () => {
    const drafts = await parse('Gather up all the recycling scattered around today');

    expect(drafts[0]?.deadline).toBe(sixPmLocal(0));
    expect(drafts[0]?.timeSensitive).toBe(true);
  });

  it('resolves "tomorrow" to 18:00 local one day ahead', async () => {
    const drafts = await parse('Call the dentist tomorrow');

    expect(drafts[0]?.deadline).toBe(sixPmLocal(1));
    expect(drafts[0]?.timeSensitive).toBe(true);
  });

  it.each([['urgent'], ['soon'], ['asap'], ['deadline']] as const)(
    'urgency keyword "%s" sets timeSensitive without inferring a deadline',
    async (keyword) => {
      const drafts = await parse(`Untangle the ${keyword} insurance paperwork pile`);

      expect(drafts[0]?.deadline).toBeNull();
      expect(drafts[0]?.timeSensitive).toBe(true);
    },
  );

  it('leaves neutral segments without deadline or urgency', async () => {
    const drafts = await parse('Gather the mountain of paperwork somewhere');

    expect(drafts[0]?.deadline).toBeNull();
    expect(drafts[0]?.timeSensitive).toBe(false);
  });
});

describe('fake provider task breakdown (Story 6.3 E2E contract)', () => {
  it('first_steps returns exactly the three starter steps with the title interpolated', async () => {
    const steps = await provider.breakdownTask({
      title: 'Sort the paperwork mountain',
      details: null,
      notes: null,
      mode: 'first_steps',
    });

    expect(steps).toEqual([
      'Get everything you need for "Sort the paperwork mountain" in one place',
      'Do just the first two minutes',
      'Set a 10-minute timer and keep going',
    ]);
  });

  it('full returns the three starters plus the three finishers, in order', async () => {
    const steps = await provider.breakdownTask({
      title: 'Sort the paperwork mountain',
      details: null,
      notes: null,
      mode: 'full',
    });

    expect(steps).toEqual([
      'Get everything you need for "Sort the paperwork mountain" in one place',
      'Do just the first two minutes',
      'Set a 10-minute timer and keep going',
      'Push through to the halfway point',
      'Finish the last stretch',
      'Put things away and tick it off',
    ]);
  });

  it('ignores details and notes — output depends only on title and mode', async () => {
    const bare = await provider.breakdownTask({
      title: 'Fix the bike',
      details: null,
      notes: null,
      mode: 'first_steps',
    });
    const contextual = await provider.breakdownTask({
      title: 'Fix the bike',
      details: 'The back brake is rubbing',
      notes: 'Allen keys are in the shed',
      mode: 'first_steps',
    });

    expect(contextual).toEqual(bare);
  });
});

describe('fake provider breakdown refine (Story 6.4 E2E contract)', () => {
  const baseInput = {
    title: 'Sort the paperwork mountain',
    details: null,
    notes: null,
    feedback: 'Too vague, give me physical actions',
    subtasks: [
      {
        title: 'Get everything you need for "Sort the paperwork mountain" in one place',
        completed: true,
      },
      { title: 'Do just the first two minutes', completed: false },
    ],
  };

  it('returns the three first_steps starters prefixed "Refined: "', async () => {
    const { steps } = await provider.refineBreakdown(baseInput);

    expect(steps).toEqual([
      'Refined: Get everything you need for "Sort the paperwork mountain" in one place',
      'Refined: Do just the first two minutes',
      'Refined: Set a 10-minute timer and keep going',
    ]);
  });

  it('distills the trimmed feedback behind an "Approach note: " prefix', async () => {
    const { notesDistillation } = await provider.refineBreakdown({
      ...baseInput,
      feedback: '  Too vague, give me physical actions \n',
    });

    expect(notesDistillation).toBe('Approach note: Too vague, give me physical actions');
  });

  it('caps the distilled feedback at 140 chars (after trimming)', async () => {
    const { notesDistillation } = await provider.refineBreakdown({
      ...baseInput,
      feedback: ` ${'f'.repeat(300)} `,
    });

    expect(notesDistillation).toBe(`Approach note: ${'f'.repeat(140)}`);
  });

  it('never splits a surrogate pair at the 140-char cap', async () => {
    // 139 ASCII chars, then an emoji (2 UTF-16 code units) straddling the cap.
    const { notesDistillation } = await provider.refineBreakdown({
      ...baseInput,
      feedback: `${'f'.repeat(139)}🎯${'g'.repeat(50)}`,
    });

    // The whole emoji is dropped rather than leaving a lone high surrogate.
    expect(notesDistillation).toBe(`Approach note: ${'f'.repeat(139)}`);
    expect(notesDistillation?.length).toBe('Approach note: '.length + 139);
  });

  it('steps depend only on the title; distillation only on the feedback', async () => {
    const bare = await provider.refineBreakdown({ ...baseInput, subtasks: [] });
    const contextual = await provider.refineBreakdown({
      ...baseInput,
      details: 'Three boxes of unopened post',
      notes: 'Started on the recycling pile',
    });

    expect(contextual).toEqual(bare);
  });
});

describe('fake provider micro-task suggestion (Story 6.4 E2E contract)', () => {
  it('returns the tiny first step with the title interpolated', async () => {
    const step = await provider.suggestMicroTask({
      title: 'Ring the council office',
      details: null,
      notes: null,
    });

    expect(step).toBe('Do just the very first minute of "Ring the council office"');
  });

  it('depends only on the title — details and notes are ignored', async () => {
    const bare = await provider.suggestMicroTask({
      title: 'Fix the bike',
      details: null,
      notes: null,
    });
    const contextual = await provider.suggestMicroTask({
      title: 'Fix the bike',
      details: 'The back brake is rubbing',
      notes: 'Allen keys are in the shed',
    });

    expect(contextual).toBe(bare);
    expect(bare).toBe('Do just the very first minute of "Fix the bike"');
  });
});

describe('fake provider determinism', () => {
  it('produces deep-equal output for the same input parsed twice', async () => {
    const text =
      'Call the dentist tomorrow.\nClean out the garage; plan the big anniversary dinner menu\nemail the urgent tax forms back';

    const first = await parse(text);
    const second = await parse(text);

    expect(second).toEqual(first);
    expect(first).toHaveLength(4);
    // details is never inferred by the fake provider
    expect(first.every((draft) => draft.details === null)).toBe(true);
  });
});
