import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';

import { showRewardToast } from '@/components/feedback/reward-toast';
import { TriageScreen } from '@/components/triage/triage-screen';
import { useToast } from '@/components/ui/toast';
import { useTasks } from '@/hooks/use-tasks';
import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { awardCutLooseStars } from '@/services/star-awards';
import { cutLooseTask, keepTask } from '@/services/task-edits';
import { undoTaskCutLoose } from '@/services/task-undo';
import { selectAttentionTasks, type AttentionRow } from '@/services/welcome-back';
import { useAppStore } from '@/stores/app-store';

/**
 * Welcome-back triage (Story 7.3, AC3) — fast decisions on tasks needing
 * attention. Keep/Later remove rows session-locally (Keep also writes
 * engagement so the 7.2 flags clear); Cut loose is the full 2.4 action with
 * star reward and "Released" toast. Back navigation always works.
 * Data + behaviour only; everything visible is TriageScreen.
 */
export default function TriageRoute() {
  const router = useRouter();
  const toast = useToast();
  const tasks = useTasks();
  const lastActiveAt = useAppStore((state) => state.lastActiveAt);

  // The absence window is captured ONCE on entry — the hook re-stamps
  // lastActiveAt on arrival, which must not empty the list mid-session.
  const windowStartRef = useRef<number>(lastActiveAt ?? Date.now());
  // Session-local removals (Later, and Keep on deadline rows whose deadline
  // cannot change here — editing deadlines is card-back territory).
  const [handledIds, setHandledIds] = useState<ReadonlySet<string>>(new Set());

  const rows = useMemo(
    () =>
      selectAttentionTasks(tasks, windowStartRef.current, new Date()).filter(
        (row) => !handledIds.has(row.task.id),
      ),
    [tasks, handledIds],
  );

  const removeLocally = (row: AttentionRow) => {
    setHandledIds((previous) => new Set(previous).add(row.task.id));
  };

  const goToDeck = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <TriageScreen
      rows={rows}
      onKeep={(row) => {
        keepTask(row.task);
        removeLocally(row);
        track('triage_task_actioned', { reason: row.reason, action: 'keep' });
      }}
      onCutLoose={(row) => {
        cutLooseTask(row.task, 'triage');
        removeLocally(row);
        track('triage_task_actioned', { reason: row.reason, action: 'cut_loose' });
        // Same reward + toast contract as every other cut-loose surface.
        // (Undo restores browsability; the triage row stays removed — the
        // task simply returns to the deck.)
        void awardCutLooseStars(db, row.task).then((stars) => {
          showRewardToast(toast, {
            title: 'Released',
            stars,
            onUndo: () => void undoTaskCutLoose(db, row.task),
          });
        });
      }}
      onLater={(row) => {
        removeLocally(row);
        track('triage_task_actioned', { reason: row.reason, action: 'later' });
      }}
      onGoToDeck={goToDeck}
    />
  );
}
