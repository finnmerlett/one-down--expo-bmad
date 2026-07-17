import { TRPCClientError } from '@trpc/client';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { BrainDumpInput, type BrainDumpState } from '@/components/brain-dump/brain-dump-input';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { trpc } from '@/lib/trpc';
import { createTasksFromBrainDump } from '@/services/tasks-repository';
import { useQuickAddStore } from '@/stores/quick-add-store';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

/** Loading treatment fades in only after this delay — no flash on fast parses (AC2). */
const SPINNER_DELAY_MS = 1_000;
/** Past this, the "Taking a bit longer..." line escalates the copy (AC3). */
const LONG_PARSE_MS = 4_000;

// Brain dump screen (Story 6.1) — the FAB's new target (UX-DR15). All AI
// calls go through the server's tRPC seam, never directly to Gemini.
export default function BrainDumpScreen() {
  const router = useRouter();
  const [state, setState] = useState<BrainDumpState>('idle');
  const mutation = trpc.ai.parseBrainDump.useMutation();

  // Escalation timers live here (not in the component — it stays a pure
  // state renderer for stories): cleared whenever the mutation settles.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = () => {
    for (const timer of timersRef.current) clearTimeout(timer);
    timersRef.current = [];
  };
  useEffect(() => clearTimers, []);

  // Once-guard: success pop and a back-button tap must not double-pop.
  const closedRef = useRef(false);
  const close = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    router.back();
  };

  const handleSubmit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    setState('submitted');
    // Length only, never the dump text (NFR-S3).
    track('brain_dump_submitted', { char_count: trimmed.length });
    clearTimers();
    timersRef.current = [
      setTimeout(() => setState('parsing'), SPINNER_DELAY_MS),
      setTimeout(() => setState('parsing_long'), LONG_PARSE_MS),
    ];
    const startedAt = Date.now();
    try {
      // mutateAsync (not mutate): the promise keeps running if the user backs
      // out mid-parse, so a successful parse still lands its tasks.
      const result = await mutation.mutateAsync({ text: trimmed });
      clearTimers();
      const created = await createTasksFromBrainDump(db, result.tasks);
      track('brain_dump_parsed', {
        task_count: created.length,
        flagged_count: created.filter((task) => task.hasCheckNeeded).length,
        duration_ms: Date.now() - startedAt,
        provider: result.provider,
      });
      close();
    } catch (error) {
      clearTimers();
      setState('error');
      // A tRPC error envelope means the server answered; anything else
      // (timeoutFetch abort, DNS, refused) is a connectivity failure.
      const reason =
        error instanceof TRPCClientError && error.data != null ? 'server_error' : 'network';
      track('brain_dump_failed', { reason });
    }
  };

  // Pop home first, THEN open the sheet — it lives on the home screen (the
  // global store means home needs no params to notice).
  const handleQuickAddInstead = () => {
    close();
    useQuickAddStore.getState().open();
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-0">
      <HStack className="items-center px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Close brain dump"
          hitSlop={8}
          onPress={close}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
      </HStack>
      <BrainDumpInput
        state={state}
        onSubmit={(text) => void handleSubmit(text)}
        onQuickAddInstead={handleQuickAddInstead}
      />
    </SafeAreaView>
  );
}
