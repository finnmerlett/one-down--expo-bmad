import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { QuickAddSheet } from './quick-add-sheet';

describe('QuickAddSheet', () => {
  test('renders content when open', () => {
    render(<QuickAddSheet isOpen onClose={() => {}} onSubmit={() => {}} />);
    expect(screen.getByLabelText('Task title')).toBeTruthy();
    expect(screen.getByLabelText('Task details (optional)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save task' })).toBeTruthy();
  });

  test('does not show inputs when closed', () => {
    render(<QuickAddSheet isOpen={false} onClose={() => {}} onSubmit={() => {}} />);
    expect(screen.queryByLabelText('Task title')).toBeNull();
  });

  test('shows inline error and does not call onSubmit when title is empty', () => {
    const onSubmit = jest.fn();
    render(<QuickAddSheet isOpen onClose={() => {}} onSubmit={onSubmit} />);
    fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
    expect(screen.getByText('Title is required')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('calls onSubmit with trimmed values and clears the inputs on success', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<QuickAddSheet isOpen onClose={() => {}} onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByLabelText('Task title'), '  walk the dog  ');
    fireEvent.changeText(screen.getByLabelText('Task details (optional)'), '  with rex  ');

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
    });

    expect(onSubmit).toHaveBeenCalledWith({ title: 'walk the dog', details: 'with rex' });
    expect(screen.getByLabelText('Task title').props.value).toBe('');
    expect(screen.getByLabelText('Task details (optional)').props.value).toBe('');
  });

  test('normalises whitespace-only details to null', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<QuickAddSheet isOpen onClose={() => {}} onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByLabelText('Task title'), 'a');
    fireEvent.changeText(screen.getByLabelText('Task details (optional)'), '   ');

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
    });

    expect(onSubmit).toHaveBeenCalledWith({ title: 'a', details: null });
  });

  test('Close button calls onClose', () => {
    const onClose = jest.fn();
    render(<QuickAddSheet isOpen onClose={onClose} onSubmit={() => {}} />);
    fireEvent.press(screen.getByRole('button', { name: 'Close add task' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('clears error once the user starts typing again', () => {
    render(<QuickAddSheet isOpen onClose={() => {}} onSubmit={() => {}} />);
    fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
    expect(screen.getByText('Title is required')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Task title'), 'a');
    expect(screen.queryByText('Title is required')).toBeNull();
  });
});
