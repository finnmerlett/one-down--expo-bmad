import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';

import { AppShell } from './app-shell';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderWithProviders(ui: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={initialMetrics}>{ui}</SafeAreaProvider>);
}

describe('AppShell', () => {
  it('renders the top bar, the floating add button, and the children', () => {
    renderWithProviders(
      <AppShell>
        <Text>shell-body</Text>
      </AppShell>,
    );

    expect(screen.getByRole('button', { name: 'Open task list' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View star activity' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add task' })).toBeTruthy();
    expect(screen.getByText('shell-body')).toBeTruthy();
  });
});
