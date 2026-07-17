import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import * as stories from './context-toggle-bar.stories';

const { AllInactive, TwoActive, SomeDisabled, ActiveButEmpty } = composeStories(stories);

describe('ContextToggleBar (portable stories)', () => {
  it('renders all five context buttons with filter labels', async () => {
    await render(<AllInactive />);

    for (const label of ['Home', 'Out & about', 'Phone', 'Laptop', 'Internet']) {
      expect(screen.getByLabelText(`Filter context: ${label}`)).toBeTruthy();
    }
  });

  it('marks active buttons selected and forwards presses to onToggle', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    await render(<TwoActive onToggle={onToggle} />);

    const home = screen.getByLabelText('Filter context: Home');
    expect(home.props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Filter context: Laptop').props.accessibilityState.selected).toBe(
      false,
    );

    await user.press(home);
    expect(onToggle).toHaveBeenCalledWith('home');

    await user.press(screen.getByLabelText('Filter context: Internet'));
    expect(onToggle).toHaveBeenCalledWith('internet');
  });

  it('disables unavailable contexts — presses do not reach onToggle', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    await render(<SomeDisabled onToggle={onToggle} />);

    const laptop = screen.getByLabelText('Filter context: Laptop');
    expect(laptop.props.accessibilityState.disabled).toBe(true);

    await user.press(laptop);
    expect(onToggle).not.toHaveBeenCalled();

    await user.press(screen.getByLabelText('Filter context: Phone'));
    expect(onToggle).toHaveBeenCalledWith('phone');
  });

  it('keeps an active-but-empty context enabled so it can be switched off (AC4)', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    await render(<ActiveButEmpty onToggle={onToggle} />);

    const laptop = screen.getByLabelText('Filter context: Laptop');
    expect(laptop.props.accessibilityState.disabled).toBe(false);
    expect(laptop.props.accessibilityState.selected).toBe(true);

    await user.press(laptop);
    expect(onToggle).toHaveBeenCalledWith('laptop');
  });
});
