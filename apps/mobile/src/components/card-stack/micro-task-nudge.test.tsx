import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import * as stories from './micro-task-nudge.stories';

const { Idle, Loading, Proposal, ErrorState } = composeStories(stories);

describe('MicroTaskNudge (portable stories)', () => {
  it('idle chip shows the calm copy and requests on tap', async () => {
    const onRequest = jest.fn();
    const user = userEvent.setup();
    await render(<Idle onRequest={onRequest} />);

    expect(screen.getByText('Stuck on this?')).toBeTruthy();
    await user.press(screen.getByLabelText('Get a tiny first step'));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it('proposal shows the step with Add it / No thanks', async () => {
    const onAdd = jest.fn();
    const onDismiss = jest.fn();
    const user = userEvent.setup();
    await render(<Proposal onAdd={onAdd} onDismiss={onDismiss} />);

    expect(
      screen.getByText('Do just the very first minute of "Ring the council office"'),
    ).toBeTruthy();
    await user.press(screen.getByLabelText('Add it'));
    expect(onAdd).toHaveBeenCalledTimes(1);
    await user.press(screen.getByLabelText('No thanks'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('loading and error render their inline states', async () => {
    await render(<Loading />);
    expect(screen.getByText('Finding a tiny first step...')).toBeTruthy();

    const onRetry = jest.fn();
    const user = userEvent.setup();
    await render(<ErrorState onRetry={onRetry} />);
    await user.press(screen.getByLabelText('Retry tiny step'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
