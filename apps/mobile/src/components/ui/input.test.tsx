import { fireEvent, render, screen } from '@testing-library/react-native';

import { Input } from './input';

describe('Input', () => {
  test('renders with the provided value', () => {
    render(<Input value="hello" onChangeText={() => {}} accessibilityLabel="greeting" />);
    expect(screen.getByDisplayValue('hello')).toBeTruthy();
  });

  test('fires onChangeText when the user types', () => {
    const onChangeText = jest.fn();
    render(<Input value="" onChangeText={onChangeText} accessibilityLabel="greeting" />);
    fireEvent.changeText(screen.getByLabelText('greeting'), 'hi');
    expect(onChangeText).toHaveBeenCalledWith('hi');
  });

  test('exposes the accessibilityLabel prop', () => {
    render(<Input value="" onChangeText={() => {}} accessibilityLabel="greeting" />);
    expect(screen.getByLabelText('greeting')).toBeTruthy();
  });
});
