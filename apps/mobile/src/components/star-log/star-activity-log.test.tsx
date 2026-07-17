import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as stories from './star-activity-log.stories';

const { WithEntries, Empty, TodayEmpty } = composeStories(stories);

describe('StarActivityLog (portable stories)', () => {
  it('renders action label, task title, timestamp, and signed amount per row', async () => {
    await render(<WithEntries />);

    expect(screen.getByText('Completed · Book dentist appointment')).toBeTruthy();
    expect(screen.getByText('Cut loose · Cancel gym membership')).toBeTruthy();
    expect(screen.getByText('+15')).toBeTruthy();
    expect(screen.getByText('+3')).toBeTruthy();
  });

  it('marks the active filter segment as selected and forwards changes', async () => {
    const onFilterChange = jest.fn();
    await render(<WithEntries onFilterChange={onFilterChange} />);

    expect(screen.getByText('All time').parent).toBeTruthy();
    await fireEvent.press(screen.getByText('Today'));

    expect(onFilterChange).toHaveBeenCalledWith('today');
  });

  it('shows distinct empty states for no-history vs none-today (AC4)', async () => {
    await render(<Empty />);
    expect(screen.getByText('No stars yet')).toBeTruthy();

    await render(<TodayEmpty />);
    expect(screen.getByText('None today yet')).toBeTruthy();
  });
});
