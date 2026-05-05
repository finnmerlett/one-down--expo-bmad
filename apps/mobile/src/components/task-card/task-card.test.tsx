import type { LocalTask } from '@one-down/shared/schema-local';
import { render, screen } from '@testing-library/react-native';

import { TaskCard } from './task-card';

function makeTask(overrides: Partial<LocalTask> = {}): LocalTask {
  return {
    id: 'test-id',
    title: 'Buy groceries',
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

describe('TaskCard', () => {
  it('renders the task title', () => {
    render(<TaskCard task={makeTask()} />);
    expect(screen.getByText('Buy groceries')).toBeTruthy();
  });

  it('has an accessibility label with the task title', () => {
    render(<TaskCard task={makeTask({ title: 'Walk the dog' })} />);
    expect(screen.getByLabelText('Task: Walk the dog')).toBeTruthy();
  });

  it('renders the quick win size badge', () => {
    render(<TaskCard task={makeTask({ size: 'quick_win' })} />);
    expect(screen.getByText('Quick Win')).toBeTruthy();
    expect(screen.getByLabelText('Size: Quick Win')).toBeTruthy();
  });

  it('renders the big time size badge', () => {
    render(<TaskCard task={makeTask({ size: 'big_time' })} />);
    expect(screen.getByText('Big Time')).toBeTruthy();
  });

  it('renders context badges', () => {
    render(<TaskCard task={makeTask({ contexts: '["home","phone"]' })} />);
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Phone')).toBeTruthy();
    expect(screen.getByLabelText('Context: Home')).toBeTruthy();
    expect(screen.getByLabelText('Context: Phone')).toBeTruthy();
  });

  it('does not render badges section when no size or contexts', () => {
    render(<TaskCard task={makeTask()} />);
    expect(screen.queryByLabelText(/Size:/)).toBeNull();
    expect(screen.queryByLabelText(/Context:/)).toBeNull();
  });

  it('shows check-needed indicator when hasCheckNeeded is true', () => {
    render(<TaskCard task={makeTask({ hasCheckNeeded: true })} />);
    expect(screen.getByLabelText('Needs confirmation')).toBeTruthy();
  });

  it('does not show check-needed indicator when hasCheckNeeded is false', () => {
    render(<TaskCard task={makeTask({ hasCheckNeeded: false })} />);
    expect(screen.queryByLabelText('Needs confirmation')).toBeNull();
  });

  it('shows deadline indicator when deadline is set', () => {
    render(<TaskCard task={makeTask({ deadline: new Date('2026-03-01') })} />);
    expect(screen.getByLabelText('Has deadline')).toBeTruthy();
  });

  it('handles invalid contexts JSON gracefully', () => {
    render(<TaskCard task={makeTask({ contexts: 'not-json' })} />);
    expect(screen.getByText('Buy groceries')).toBeTruthy();
    expect(screen.queryByLabelText(/Context:/)).toBeNull();
  });
});
