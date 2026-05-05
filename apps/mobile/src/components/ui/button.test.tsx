import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './button';

describe('Button', () => {
  test('renders the label and exposes button role', () => {
    render(<Button onPress={() => {}}>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  test('fires onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Save</Button>);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    render(
      <Button onPress={onPress} disabled>
        Save
      </Button>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  test('exposes accessibility disabled state when disabled', () => {
    render(
      <Button onPress={() => {}} disabled>
        Save
      </Button>,
    );
    const node = screen.getByRole('button', { name: 'Save' });
    expect(node.props.accessibilityState?.disabled).toBe(true);
  });
});
