import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { httpBatchLink } from '@trpc/client';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { trpc } from '@/lib/trpc';

const mockDb = { __mock: 'db' } as const;

jest.mock('@/hooks/use-local-db', () => ({
  useLocalDb: () => mockDb,
}));

const mockCuratedTasks = jest.fn();
jest.mock('@/hooks/use-tasks', () => ({
  useTasks: () => [],
  useCuratedTasks: () => mockCuratedTasks(),
  useMostRecentTask: () => undefined,
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

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: 'http://test.local/trpc' })],
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </trpc.Provider>
      </SafeAreaProvider>
    );
  }

  return { Wrapper };
}

function renderHome() {
  const { Wrapper } = makeWrapper();
  return render(
    <Wrapper>
      <HomeScreen />
    </Wrapper>,
  );
}

describe('HomeScreen', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    useQuickAddStore.setState({ isOpen: false });
    mockCreateTask.mockReset();
    mockCuratedTasks.mockReset();
    mockCuratedTasks.mockReturnValue([]);
    globalThis.fetch = jest.fn(
      () => new Promise<Response>(() => undefined),
    ) as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
  });

  test('renders the empty state, add task button, and connection status when no tasks exist', () => {
    renderHome();
    expect(screen.getByText('No tasks yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add task' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open task list' })).toBeTruthy();
    expect(screen.getByText('Checking…')).toBeTruthy();
    expect(screen.getByLabelText('Checking server connection')).toBeTruthy();
  });

  test('renders the card stack with task titles when tasks exist', () => {
    mockCuratedTasks.mockReturnValue([
      {
        id: 'a',
        title: 'walk the dog',
        details: null,
        status: 'pending',
        size: null,
        contexts: null,
        deadline: null,
        hasCheckNeeded: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    renderHome();
    expect(screen.getByText('walk the dog')).toBeTruthy();
    expect(screen.queryByText('No tasks yet')).toBeNull();
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
