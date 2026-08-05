import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react-native';

import * as cardStackStories from './card-stack.stories';
import * as taskCardStories from './task-card.stories';

const { ThreeTasks, SingleTask } = composeStories(cardStackStories);
const { TitleOnly, WithSizeAndContexts } = composeStories(taskCardStories);

describe('TaskCard (portable stories)', () => {
  it('shows title, star value, and the bottom-rail size caps (v1.5 face)', async () => {
    await render(<WithSizeAndContexts />);

    expect(screen.getByText('Book dentist appointment')).toBeTruthy();
    // Bottom rail carries size as mono caps + the due line (spec §4).
    expect(screen.getByText('QUICK WIN')).toBeTruthy();
    // Star preview (Story 3.3) — every card front shows its potential value.
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('renders without a size caps line when size is unset', async () => {
    await render(<TitleOnly />);

    expect(screen.getByText('Water the plants')).toBeTruthy();
    expect(screen.queryByText('QUICK WIN')).toBeNull();
    // The rail is always present — no-deadline cards state it plainly.
    expect(screen.getByText('No deadline')).toBeTruthy();
  });
});

describe('CardStack (portable stories)', () => {
  it('announces the top card; only the next card carries content (v1.5 fan)', async () => {
    await render(<ThreeTasks />);

    // Label announces the star preview (Story 3.3) — the top card is an
    // accessible container, so TalkBack/Maestro only see this string.
    expect(
      screen.getByLabelText('Task: Water the plants. Worth 10 stars. Card 1 of 3'),
    ).toBeTruthy();
    // Depth-1 renders content (it is the next task, ready before the front
    // card leaves); depth-2+ are blank card-stock backs (spec §4).
    expect(screen.getByText('Write trip packing list')).toBeTruthy();
    expect(screen.queryByText('Renew passport')).toBeNull();
  });

  it('renders a single task without duplicating it in the window', async () => {
    await render(<SingleTask />);

    expect(screen.getAllByText('The only task')).toHaveLength(1);
    expect(screen.getByLabelText('Task: The only task. Worth 10 stars. Card 1 of 1')).toBeTruthy();
  });
});

// Swipe-advance + wrap-around are gesture/animation-driven and verified
// on-device by Maestro flow 04 — jest simulation of Reanimated worklet
// callbacks is not representative of the UI-thread behavior.
