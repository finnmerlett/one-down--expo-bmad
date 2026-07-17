import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as sectionStories from './notification-preferences-section.stories';

const { Defaults, PermissionDenied, ChallengesWeekly } = composeStories(sectionStories);

describe('NotificationPreferencesSection (portable stories)', () => {
  it('renders defaults: deadline on, challenges off, no cadence row, no banner', async () => {
    await render(<Defaults />);

    expect(screen.getByLabelText('Deadline reminders').props.value).toBe(true);
    expect(screen.getByLabelText('Challenge invitations').props.value).toBe(false);
    expect(screen.queryByLabelText('Challenge frequency: Weekly')).toBeNull();
    expect(screen.queryByText(/Notifications are off/)).toBeNull();
  });

  it('shows the calm banner with a system-settings action when permission is denied', async () => {
    const onOpenSystemSettings = jest.fn();
    await render(<PermissionDenied onOpenSystemSettings={onOpenSystemSettings} />);

    expect(
      screen.getByText('Notifications are off. You can enable them any time in system settings.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Open system settings'));
    expect(onOpenSystemSettings).toHaveBeenCalledTimes(1);
  });

  it('enabling challenges lands on weekly; cadence taps report the new cadence', async () => {
    const onChangeChallenges = jest.fn();
    await render(<Defaults onChangeChallenges={onChangeChallenges} />);

    fireEvent(screen.getByLabelText('Challenge invitations'), 'valueChange', true);
    expect(onChangeChallenges).toHaveBeenCalledWith('weekly');
  });

  it('shows the cadence selector when challenges are on and marks the selection', async () => {
    const onChangeChallenges = jest.fn();
    await render(<ChallengesWeekly onChangeChallenges={onChangeChallenges} />);

    expect(
      screen.getByLabelText('Challenge frequency: Weekly').props.accessibilityState?.selected,
    ).toBe(true);
    await fireEvent.press(screen.getByLabelText('Challenge frequency: Every 3 days'));
    expect(onChangeChallenges).toHaveBeenCalledWith('every_3_days');

    // Switching challenges back off reports 'off'.
    fireEvent(screen.getByLabelText('Challenge invitations'), 'valueChange', false);
    expect(onChangeChallenges).toHaveBeenCalledWith('off');
  });
});
