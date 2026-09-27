import { useRouter } from 'expo-router';
import { useState } from 'react';

import type { StarLogFilter } from '@/components/star-log/star-activity-log';
import { StarLogScreen } from '@/components/star-log/star-log-screen';
import { useStarActivity } from '@/hooks/use-star-activity';
import { startOfLocalDay } from '@/services/star-totals';

// Star activity log route (Story 4.3) — full-screen push from the top-bar
// counter, mirroring the task-list pattern. Default filter: All time (AC3 —
// the log shows ALL transactions on open).
// Data + behaviour for the star log; everything visible is StarLogScreen.
export default function StarLogRoute() {
  const router = useRouter();
  const entries = useStarActivity();
  const [filter, setFilter] = useState<StarLogFilter>('all_time');

  // Same device-local midnight rule as the counter's daily total (4.2).
  const dayStart = startOfLocalDay(new Date()).getTime();
  const visibleEntries =
    filter === 'today' ? entries.filter((entry) => entry.createdAt.getTime() >= dayStart) : entries;

  return (
    <StarLogScreen
      entries={visibleEntries}
      filter={filter}
      onFilterChange={setFilter}
      onBack={() => router.back()}
    />
  );
}
