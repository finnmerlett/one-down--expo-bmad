import { fireEvent, render, screen } from '@testing-library/react-native';

import { StarBoxPlaceholder } from './star-box-placeholder';

describe('StarBoxPlaceholder', () => {
  it('renders an accessible button with star activity label', () => {
    render(<StarBoxPlaceholder />);

    const button = screen.getByRole('button', { name: 'View star activity' });

    expect(button).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    render(<StarBoxPlaceholder onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'View star activity' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
