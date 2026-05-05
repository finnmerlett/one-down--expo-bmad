import { fireEvent, render, screen } from '@testing-library/react-native';

import { TopBar } from './top-bar';

describe('TopBar', () => {
  it('renders task list, star box, and settings as accessible buttons', () => {
    render(<TopBar />);

    expect(screen.getByRole('button', { name: 'Open task list' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View star activity' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeTruthy();
  });

  it('fires the matching press handler for each control', () => {
    const onTaskListPress = jest.fn();
    const onStarBoxPress = jest.fn();
    const onSettingsPress = jest.fn();

    render(
      <TopBar
        onTaskListPress={onTaskListPress}
        onStarBoxPress={onStarBoxPress}
        onSettingsPress={onSettingsPress}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Open task list' }));
    fireEvent.press(screen.getByRole('button', { name: 'View star activity' }));
    fireEvent.press(screen.getByRole('button', { name: 'Open settings' }));

    expect(onTaskListPress).toHaveBeenCalledTimes(1);
    expect(onStarBoxPress).toHaveBeenCalledTimes(1);
    expect(onSettingsPress).toHaveBeenCalledTimes(1);
  });
});
