import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react-native';

import * as taskCardStories from './task-card.stories';

const { TitleOnly, StaleTask, AvoidedTask } = composeStories(taskCardStories);

describe('TaskCard health indicator (Story 7.2, portable stories)', () => {
  it('shows the muted stale chip', async () => {
    await render(<StaleTask />);

    expect(screen.getByText('Been a while')).toBeTruthy();
  });

  it('shows the avoided chip for threshold skips inside the window', async () => {
    await render(<AvoidedTask />);

    expect(screen.getByText('Skipped a lot')).toBeTruthy();
  });

  it('shows no health chip on a healthy task', async () => {
    await render(<TitleOnly />);

    expect(screen.queryByText('Been a while')).toBeNull();
    expect(screen.queryByText('Skipped a lot')).toBeNull();
  });
});
