import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import * as stories from './mode-toggle.stories';

const { Neither, QuickWinsActive, BigTimeActive } = composeStories(stories);

describe('ModeToggle (portable stories)', () => {
  it('presses forward the pressed size to onToggle', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    await render(<Neither onToggle={onToggle} />);

    await user.press(screen.getByLabelText('Mode: Quick wins'));
    expect(onToggle).toHaveBeenCalledWith('quick_win');

    await user.press(screen.getByLabelText('Mode: Big time'));
    expect(onToggle).toHaveBeenCalledWith('big_time');
  });

  it('marks only the active option selected', async () => {
    await render(<QuickWinsActive />);
    expect(screen.getByLabelText('Mode: Quick wins').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Mode: Big time').props.accessibilityState.selected).toBe(false);
  });

  it('re-press of the active option still reaches onToggle (deactivation path)', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    await render(<BigTimeActive onToggle={onToggle} />);

    const bigTime = screen.getByLabelText('Mode: Big time');
    expect(bigTime.props.accessibilityState.selected).toBe(true);

    await user.press(bigTime);
    expect(onToggle).toHaveBeenCalledWith('big_time');
  });
});
