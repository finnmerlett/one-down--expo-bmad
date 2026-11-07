import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import type { StarActivityData } from '@one-down/shared';

import { startOfLocalDay } from '@/services/star-totals';

import type { StarLogFilter } from './star-activity-log';
import * as logStories from './star-activity-log.stories';
import { StarLogScreen } from './star-log-screen';

/** Two earned today, one from an older day (dated timestamp format). */
const ENTRIES: StarActivityData[] = logStories.WithEntries.args?.entries ?? [];
/** History exists, but nothing earned today. */
const OLDER_ONLY = ENTRIES.filter(
  (entry) => entry.createdAt.getTime() < startOfLocalDay(new Date()).getTime(),
);

/**
 * The star log with its filter held locally (seeded from args) and the
 * route's same device-local-midnight Today rule — so on the canvas the
 * Today / All time chips re-filter the log, just like the app.
 */
function InteractiveStarLog({
  entries,
  initialFilter = 'all_time',
}: {
  entries: StarActivityData[];
  initialFilter?: StarLogFilter;
}) {
  const [filter, setFilter] = useState(initialFilter);
  const dayStart = startOfLocalDay(new Date()).getTime();
  const visibleEntries =
    filter === 'today' ? entries.filter((entry) => entry.createdAt.getTime() >= dayStart) : entries;
  return (
    <StarLogScreen
      entries={visibleEntries}
      filter={filter}
      onFilterChange={setFilter}
      onBack={() => {}}
    />
  );
}

const meta = {
  title: 'screens/StarLog',
  component: InteractiveStarLog,
  args: { entries: ENTRIES },
} satisfies Meta<typeof InteractiveStarLog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** All time: completions, a cut-loose row and an older dated entry. */
export const WithEntries: Story = {};

/** No transactions at all — first-run guidance. */
export const Empty: Story = { args: { entries: [] } };

/** Today filter with nothing earned yet today (older history exists). */
export const TodayEmpty: Story = { args: { entries: OLDER_ONLY, initialFilter: 'today' } };
