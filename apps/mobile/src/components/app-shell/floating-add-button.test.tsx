import { fireEvent, render, screen } from '@testing-library/react-native';

import { FloatingAddButton } from './floating-add-button';

describe('FloatingAddButton', () => {
  it('renders an accessible add task button', () => {
    render(<FloatingAddButton />);

    expect(screen.getByRole('button', { name: 'Add task' })).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    render(<FloatingAddButton onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Add task' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
