import { render, screen } from '@testing-library/react-native';

import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders the empty state message', () => {
    render(<EmptyState />);
    expect(screen.getByText('No tasks yet')).toBeTruthy();
    expect(screen.getByText(/Tap the \+ button/)).toBeTruthy();
  });

  it('has an accessibility label', () => {
    render(<EmptyState />);
    expect(screen.getByLabelText('No tasks')).toBeTruthy();
  });
});
