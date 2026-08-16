import { composeStories } from '@storybook/react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import * as stories from './session-section.stories';

const { AskOnOpen, StraightToStack } = composeStories(stories);

describe('SessionSection (portable stories — 9.8 D4)', () => {
  it('forwards a toggle-off', async () => {
    const onToggle = jest.fn();
    await render(<AskOnOpen onToggle={onToggle} />);

    const toggle = screen.getByLabelText('Context box on open toggle');
    expect(toggle.props.value).toBe(true);
    await fireEvent(toggle, 'valueChange', false);
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('renders the off state', async () => {
    await render(<StraightToStack />);

    expect(screen.getByLabelText('Context box on open toggle').props.value).toBe(false);
  });
});
