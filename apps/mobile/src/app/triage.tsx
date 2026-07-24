import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { showRewardToast } from '@/components/feedback/reward-toast';
import { TriageList } from '@/components/triage/triage-list';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useTasks } from '@/hooks/use-tasks';
import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { awardCutLooseStars } from '@/services/star-awards';
import { cutLooseTask, keepTask } from '@/services/task-edits';
import { selectAttentionTasks, type AttentionRow } from '@/services/welcome-back';
import { useAppStore } from '@/stores/app-store';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

/**
 * Welcome-back triage (Story 7.3, AC3) — fast decisions on tasks needing
 * attention. Keep/Later remove rows session-locally (Keep also writes
 * engagement so the 7.2 flags clear); Cut loose is the full 2.4 action with
 * star reward and "Released" toast. Back navigation always works.
 */
export default function TriageScreen() {
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
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-0">
      <HStack className="items-center gap-1 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Back to home"
          hitSlop={8}
          onPress={goToDeck}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
        <Text className="text-xl font-semibold text-typography-900">What's up</Text>
      </HStack>
      <TriageList
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
          void awardCutLooseStars(db, row.task).then((stars) => {
            showRewardToast(toast, { title: 'Released', stars });
          });
        }}
        onLater={(row) => {
          removeLocally(row);
          track('triage_task_actioned', { reason: row.reason, action: 'later' });
        }}
        onGoToDeck={goToDeck}
      />
    </SafeAreaView>
  );
}
