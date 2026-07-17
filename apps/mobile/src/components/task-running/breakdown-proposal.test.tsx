import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import * as stories from './breakdown-proposal.stories';

const { Loading, Proposal, FullProposal, ErrorState } = composeStories(stories);

describe('BreakdownProposal (portable stories)', () => {
  it('loading shows only the spinner copy', async () => {
    await render(<Loading />);
    expect(screen.getByText('Breaking this down...')).toBeTruthy();
    expect(screen.queryByLabelText('Add these steps')).toBeNull();
  });

  it('proposal lists steps and forwards the three actions', async () => {
    const onAccept = jest.fn();
    const onShowAll = jest.fn();
    const onReject = jest.fn();
    const user = userEvent.setup();
    await render(<Proposal onAccept={onAccept} onShowAll={onShowAll} onReject={onReject} />);

    expect(screen.getByText('Do just the first two minutes')).toBeTruthy();

    await user.press(screen.getByLabelText('Show all steps'));
    expect(onShowAll).toHaveBeenCalledTimes(1);
    await user.press(screen.getByLabelText('Add these steps'));
    expect(onAccept).toHaveBeenCalledTimes(1);
    await user.press(screen.getByLabelText('Not helpful'));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('hides "Show all steps" once the proposal is already full', async () => {
    await render(<FullProposal />);
    expect(screen.queryByLabelText('Show all steps')).toBeNull();
    expect(screen.getByText('Put things away and tick it off')).toBeTruthy();
  });

  it('error offers a visible retry', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    await render(<ErrorState onRetry={onRetry} />);

    expect(screen.getByText("Couldn't reach the server — working offline")).toBeTruthy();
    await user.press(screen.getByLabelText('Retry breakdown'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
