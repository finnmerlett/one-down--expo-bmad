import { TRPCClientError } from '@trpc/client';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import type { ParsedTaskDraft } from '@one-down/shared';

import { BrainDumpCheck } from '@/components/brain-dump/brain-dump-check';
import { BrainDumpInput, type BrainDumpState } from '@/components/brain-dump/brain-dump-input';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
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

/**
 * Brain dump screen (Story 6.1 → v1.5 D6 gate): the dump parses into a CHECK
 * stage — one box per task with its evidence quotes, unclaimed lines as
 * promotable dashed rows — and NOTHING saves until `Add N tasks`. Backing
 * out (Back to the dump, back arrow) discards the parse; the dump text is
 * kept so nothing is ever lost. All AI calls go through the server's tRPC
 * seam, never directly to Gemini.
 */
export default function BrainDumpScreen() {
  const router = useRouter();
  const [state, setState] = useState<BrainDumpState>('idle');
  const [text, setText] = useState('');
  const [check, setCheck] = useState<{ tasks: ParsedTaskDraft[]; unclaimed: string[] } | null>(
    null,
  );
  const [working, setWorking] = useState(false);
  const [promotingLine, setPromotingLine] = useState<string | null>(null);
  const parseMutation = trpc.ai.parseBrainDump.useMutation();
  const promoteMutation = trpc.ai.promoteDumpLine.useMutation();

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

  const handleSubmit = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || parseMutation.isPending) return;
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
      const result = await parseMutation.mutateAsync({ text: trimmed });
      clearTimers();
      track('brain_dump_parsed', {
        task_count: result.tasks.length,
        flagged_count: result.tasks.filter(
          (task) => task.size === null || task.contexts.length === 0 || task.deadline === null,
        ).length,
        duration_ms: Date.now() - startedAt,
        provider: result.provider,
      });
      // The GATE (07f): nothing saved yet — the check stage owns it now.
      setState('idle');
      setCheck({ tasks: result.tasks, unclaimed: result.unclaimed });
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

  // 07g/h: re-parse the WHOLE dump with the user's feedback — counts move.
  const handleChangeThese = async (feedback: string) => {
    if (working) return;
    setWorking(true);
    track('brain_dump_change_submitted', { feedback_chars: feedback.length });
    const startedAt = Date.now();
    try {
      const result = await parseMutation.mutateAsync({ text: text.trim(), feedback });
      setCheck({ tasks: result.tasks, unclaimed: result.unclaimed });
      track('brain_dump_reparsed', {
        task_count: result.tasks.length,
        unclaimed_count: result.unclaimed.length,
        duration_ms: Date.now() - startedAt,
        provider: result.provider,
      });
    } catch {
      // Quiet failure: the existing check list stays untouched and usable.
      track('brain_dump_failed', { reason: 'server_error' });
    } finally {
      setWorking(false);
    }
  };

  const handlePromote = async (line: string) => {
    if (promotingLine !== null) return;
    setPromotingLine(line);
    try {
      const result = await promoteMutation.mutateAsync({ line });
      setCheck((previous) =>
        previous
          ? {
              tasks: [...previous.tasks, result.task],
              unclaimed: previous.unclaimed.filter((candidate) => candidate !== line),
            }
          : previous,
      );
      track('brain_dump_line_promoted', { provider: result.provider });
    } catch {
      // The + simply stops spinning; the row stays promotable.
      track('brain_dump_failed', { reason: 'server_error' });
    } finally {
      setPromotingLine(null);
    }
  };

  const handleAddAll = async () => {
    const drafts = check?.tasks ?? [];
    if (drafts.length === 0) return;
    const created = await createTasksFromBrainDump(db, drafts);
    track('brain_dump_tasks_added', {
      task_count: created.length,
      not_added_count: check?.unclaimed.length ?? 0,
    });
    close();
  };

  // Pop home first, THEN open the sheet — it lives on the home screen (the
  // global store means home needs no params to notice).
  const handleQuickAddInstead = () => {
    close();
    useQuickAddStore.getState().open();
  };

  const checking = check !== null;

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <HStack className="items-center gap-2 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label={checking ? 'Back to the dump' : 'Close brain dump'}
          hitSlop={8}
          onPress={() => {
            // Backing out of the check DISCARDS the parse, never the text.
            if (checking) setCheck(null);
            else close();
          }}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
        {checking ? (
          <Text className="font-heading text-2xl text-typography-900">
            {`Check these ${check.tasks.length}`}
          </Text>
        ) : null}
      </HStack>
      {checking ? (
        <BrainDumpCheck
          tasks={check.tasks}
          unclaimed={check.unclaimed}
          working={working}
          promotingLine={promotingLine}
          onRename={(index, title) =>
            setCheck((previous) =>
              previous
                ? {
                    ...previous,
                    tasks: previous.tasks.map((task, candidate) =>
                      candidate === index ? { ...task, title } : task,
                    ),
                  }
                : previous,
            )
          }
          onDrop={(index) =>
            setCheck((previous) =>
              previous
                ? {
                    ...previous,
                    tasks: previous.tasks.filter((_, candidate) => candidate !== index),
                  }
                : previous,
            )
          }
          onPromote={(line) => void handlePromote(line)}
          onChangeThese={(feedback) => void handleChangeThese(feedback)}
          onAddAll={() => void handleAddAll()}
          onBackToDump={() => setCheck(null)}
        />
      ) : (
        <BrainDumpInput
          state={state}
          value={text}
          onChangeText={setText}
          onSubmit={(submitted) => void handleSubmit(submitted)}
          onQuickAddInstead={handleQuickAddInstead}
        />
      )}
    </SafeAreaView>
  );
}
