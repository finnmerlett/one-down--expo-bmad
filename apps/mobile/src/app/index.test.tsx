import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockDb = { __mock: 'db' } as const;

jest.mock('@/hooks/use-local-db', () => ({
  useLocalDb: () => mockDb,
}));

const mockMostRecent = jest.fn();
jest.mock('@/hooks/use-tasks', () => ({
  useTasks: () => [],
  useMostRecentTask: () => mockMostRecent(),
}));

const mockCreateTask = jest.fn();
jest.mock('@/services/tasks-repository', () => ({
  createTask: (...args: unknown[]) => mockCreateTask(...args),
  listTasksQuery: () => ({}),
  getMostRecentTaskQuery: () => ({}),
}));

import { useQuickAddStore } from '@/stores/quick-add-store';
import HomeScreen from './index';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderHome() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <HomeScreen />
    </SafeAreaProvider>,
  );
}

describe('HomeScreen', () => {
  beforeEach(() => {
    useQuickAddStore.setState({ isOpen: false });
    mockCreateTask.mockReset();
    mockMostRecent.mockReset();
    mockMostRecent.mockReturnValue(undefined);
  });

  test('renders the empty placeholder and the add task button when no tasks exist', () => {
    renderHome();
    expect(screen.getByText('Your tasks will appear here')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add task' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open task list' })).toBeTruthy();
  });

  test('renders the most recent task title when one exists', () => {
    mockMostRecent.mockReturnValue({
      id: 'a',
      title: 'walk the dog',
      details: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    renderHome();
    expect(screen.getByText('walk the dog')).toBeTruthy();
    expect(screen.queryByText('Your tasks will appear here')).toBeNull();
  });

  test('tapping the FAB opens the quick-add sheet', () => {
    renderHome();
    expect(screen.queryByLabelText('Task title')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Add task' }));
    expect(screen.getByLabelText('Task title')).toBeTruthy();
  });

  test('submitting the sheet calls createTask with the trimmed input', async () => {
    renderHome();
    fireEvent.press(screen.getByRole('button', { name: 'Add task' }));
    fireEvent.changeText(screen.getByLabelText('Task title'), '  walk the dog  ');
    fireEvent.changeText(screen.getByLabelText('Task details (optional)'), 'with rex');

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
    });

    expect(mockCreateTask).toHaveBeenCalledWith(mockDb, {
      title: 'walk the dog',
      details: 'with rex',
    });
  });
});
