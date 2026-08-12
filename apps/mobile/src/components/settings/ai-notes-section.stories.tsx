import type { Meta, StoryObj } from '@storybook/react';

import { AiNotesSection } from './ai-notes-section';

const meta = {
  title: 'settings/AiNotesSection',
  component: AiNotesSection,
  args: {
    notes: '',
    onChange: () => {},
    onBlur: () => {},
  },
} satisfies Meta<typeof AiNotesSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Fresh install — nothing learned yet, placeholder shows. */
export const Empty: Story = {};

/** Grown notes: automatic learnings + a hand-written line (9-5 items 4+8). */
export const WithLearnings: Story = {
  args: {
    notes: [
      '- Learned: I prefer steps I can physically tick off',
      '- Sized "Call the dentist" as big time (we guessed quick win)',
      '- Mornings are useless for me, never suggest early starts',
    ].join('\n'),
  },
};
