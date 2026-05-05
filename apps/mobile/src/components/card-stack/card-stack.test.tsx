import type { LocalTask } from '@one-down/shared/schema-local';
import { render, screen } from '@testing-library/react-native';

import { CardStack } from './card-stack';

function makeTask(overrides: Partial<LocalTask> = {}): LocalTask {
  return {
    id: 'test-id',
    title: 'Test task',
    details: null,
    status: 'pending',
    size: null,
    contexts: null,
    deadline: null,
    hasCheckNeeded: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('CardStack', () => {
  it('renders empty state when no cards', () => {
    render(<CardStack cards={[]} />);
    expect(screen.getByText('No tasks yet')).toBeTruthy();
  });

  it('renders the top card with task title', () => {
    const cards = [makeTask({ id: '1', title: 'First task' })];
    render(<CardStack cards={cards} />);
    expect(screen.getByText('First task')).toBeTruthy();
  });

  it('renders up to 3 visible cards', () => {
    const cards = [
      makeTask({ id: '1', title: 'Task One' }),
      makeTask({ id: '2', title: 'Task Two' }),
      makeTask({ id: '3', title: 'Task Three' }),
      makeTask({ id: '4', title: 'Task Four' }),
    ];
    render(<CardStack cards={cards} />);
    expect(screen.getByText('Task One')).toBeTruthy();
    expect(screen.getByText('Task Two')).toBeTruthy();
    expect(screen.getByText('Task Three')).toBeTruthy();
    expect(screen.queryByText('Task Four')).toBeNull();
  });

  it('renders single card without crashing', () => {
    const cards = [makeTask({ id: '1', title: 'Only task' })];
    render(<CardStack cards={cards} />);
    expect(screen.getByText('Only task')).toBeTruthy();
  });

  it('has accessibility hint on top card for swipe', () => {
    const cards = [makeTask({ id: '1', title: 'Swipeable' })];
    render(<CardStack cards={cards} />);
    expect(screen.getByLabelText('Top card')).toBeTruthy();
  });
});
