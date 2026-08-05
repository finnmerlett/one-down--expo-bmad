import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import * as contextBarStories from './context-bar.stories';
import * as contextSheetStories from './context-sheet.stories';
import * as sizeSwitcherStories from './size-switcher.stories';

const { AllContexts, ThreeSelected } = composeStories(contextBarStories);
const { Expanded, SomeUnavailable } = composeStories(contextSheetStories);
const { All, QuickWins } = composeStories(sizeSwitcherStories);

describe('stack-filters v1.5 (portable stories)', () => {
  it('collapsed bar summarises the selection in its a11y label and expands on press', async () => {
    const onExpand = jest.fn();
    const user = userEvent.setup();
    await render(<ThreeSelected onExpand={onExpand} />);

    const bar = screen.getByLabelText('Right now, contexts: Home, Phone, Internet');
    await user.press(bar);
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('collapsed bar with nothing selected reads as all contexts', async () => {
    await render(<AllContexts />);
    expect(screen.getByLabelText('Right now, all contexts')).toBeTruthy();
  });

  it('sheet renders all five context tiles with filter labels and forwards toggles', async () => {
    const onToggleContext = jest.fn();
    const user = userEvent.setup();
    await render(<Expanded onToggleContext={onToggleContext} />);

    for (const label of ['Home', 'Out & about', 'Phone', 'Laptop', 'Internet']) {
      expect(screen.getByLabelText(`Filter context: ${label}`)).toBeTruthy();
    }
    await user.press(screen.getByLabelText('Filter context: Laptop'));
    expect(onToggleContext).toHaveBeenCalledWith('laptop');
  });

  it('sheet marks selected tiles and disables unavailable ones (AC4 carry-over)', async () => {
    const onToggleContext = jest.fn();
    const user = userEvent.setup();
    await render(<SomeUnavailable onToggleContext={onToggleContext} />);

    expect(screen.getByLabelText('Filter context: Home').props.accessibilityState.selected).toBe(
      true,
    );
    const laptop = screen.getByLabelText('Filter context: Laptop');
    expect(laptop.props.accessibilityState.disabled).toBe(true);
    await user.press(laptop);
    expect(onToggleContext).not.toHaveBeenCalled();
  });

  it('sheet time segments set the tri-state mode (Either = null)', async () => {
    const onSetMode = jest.fn();
    const user = userEvent.setup();
    await render(<Expanded onSetMode={onSetMode} />);

    await user.press(screen.getByLabelText('Mode: Big time'));
    expect(onSetMode).toHaveBeenCalledWith('big_time');

    await user.press(screen.getByLabelText('Mode: Either'));
    expect(onSetMode).toHaveBeenCalledWith(null);
  });

  it('sheet Done reaches the collapse handler', async () => {
    const onDone = jest.fn();
    const user = userEvent.setup();
    await render(<Expanded onDone={onDone} />);

    await user.press(screen.getByLabelText('Done choosing contexts'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('size switcher sets the mode explicitly, including All = null', async () => {
    const onSetMode = jest.fn();
    const user = userEvent.setup();
    await render(<QuickWins onSetMode={onSetMode} />);

    expect(screen.getByLabelText('Mode: Quick wins').props.accessibilityState.selected).toBe(true);

    await user.press(screen.getByLabelText('Mode: All'));
    expect(onSetMode).toHaveBeenCalledWith(null);

    await user.press(screen.getByLabelText('Mode: Big time'));
    expect(onSetMode).toHaveBeenCalledWith('big_time');
  });

  it('size switcher marks All selected when mode is null', async () => {
    await render(<All />);
    expect(screen.getByLabelText('Mode: All').props.accessibilityState.selected).toBe(true);
  });
});
