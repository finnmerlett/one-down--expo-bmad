import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react-native';

import * as cardStackStories from './card-stack.stories';
import * as taskCardStories from './task-card.stories';

const { ThreeTasks, SingleTask } = composeStories(cardStackStories);
const { TitleOnly, WithSizeAndContexts } = composeStories(taskCardStories);

describe('TaskCard (portable stories)', () => {
  it('shows title, size tag, context badges, and the star-value chip', async () => {
    await render(<WithSizeAndContexts />);

    expect(screen.getByText('Book dentist appointment')).toBeTruthy();
    expect(screen.getByText('Quick win')).toBeTruthy();
    expect(screen.getByText('Phone')).toBeTruthy();
    expect(screen.getByText('Internet')).toBeTruthy();
    // Star preview (Story 3.3) — every card front shows its potential value.
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('renders without badges when size and contexts are unset', async () => {
    await render(<TitleOnly />);

    expect(screen.getByText('Water the plants')).toBeTruthy();
    expect(screen.queryByText('Quick win')).toBeNull();
  });
});

describe('CardStack (portable stories)', () => {
  it('announces the top card and renders the 3-card window', async () => {
    await render(<ThreeTasks />);

    // Label announces the star preview (Story 3.3) — the top card is an
    // accessible container, so TalkBack/Maestro only see this string.
    expect(
      screen.getByLabelText('Task: Water the plants. Worth 10 stars. Card 1 of 3'),
    ).toBeTruthy();
    // Background cards render content too (decorative hints).
    expect(screen.getByText('Write trip packing list')).toBeTruthy();
    expect(screen.getByText('Renew passport')).toBeTruthy();
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
