import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import * as stories from './brain-dump-input.stories';

const { Idle, Submitted, Parsing, ParsingLong, ErrorState } = composeStories(stories);

describe('BrainDumpInput (portable stories)', () => {
  it('disables submit on empty input and forwards the typed text on press', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<Idle onSubmit={onSubmit} />);

    const submit = screen.getByLabelText('Parse my tasks');
    expect(submit.props.accessibilityState?.disabled).toBe(true);

    await user.type(screen.getByLabelText('Brain dump'), 'Call the dentist');
    await user.press(submit);
    expect(onSubmit).toHaveBeenCalledWith('Call the dentist');
  });

  it('replaces the submit button while pending; spinner copy only after the delay state', async () => {
    await render(<Submitted />);
    expect(screen.queryByLabelText('Parse my tasks')).toBeNull();
    expect(screen.queryByText('Parsing your tasks...')).toBeNull();

    await render(<Parsing />);
    expect(screen.getByText('Parsing your tasks...')).toBeTruthy();
    expect(screen.queryByText('Taking a bit longer...')).toBeNull();

    await render(<ParsingLong />);
    expect(screen.getByText('Taking a bit longer...')).toBeTruthy();
  });

  it('error state keeps retry visible and offers quick add', async () => {
    const onQuickAddInstead = jest.fn();
    const user = userEvent.setup();
    await render(<ErrorState onQuickAddInstead={onQuickAddInstead} />);

    expect(
      screen.getByText(
        'Brain dump needs an internet connection. You can still add tasks one at a time.',
      ),
    ).toBeTruthy();
    // Retry (the submit button) is back on screen.
    expect(screen.getByLabelText('Parse my tasks')).toBeTruthy();

    await user.press(screen.getByLabelText('Use quick add instead'));
    expect(onQuickAddInstead).toHaveBeenCalledTimes(1);
  });
});
