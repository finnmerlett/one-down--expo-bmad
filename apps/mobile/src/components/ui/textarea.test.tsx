import { fireEvent, render, screen } from '@testing-library/react-native';

import { Textarea } from './textarea';

describe('Textarea', () => {
  test('renders multiline by default', () => {
    render(<Textarea value="" onChangeText={() => {}} accessibilityLabel="notes" />);
    const node = screen.getByLabelText('notes');
    expect(node.props.multiline).toBe(true);
  });

  test('fires onChangeText when the user types', () => {
    const onChangeText = jest.fn();
    render(<Textarea value="" onChangeText={onChangeText} accessibilityLabel="notes" />);
    fireEvent.changeText(screen.getByLabelText('notes'), 'first line');
    expect(onChangeText).toHaveBeenCalledWith('first line');
  });
});
