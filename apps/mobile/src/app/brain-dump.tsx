import { TRPCClientError } from '@trpc/client';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { BrainDumpCheck } from '@/components/brain-dump/brain-dump-check';
import { BrainDumpInput, type BrainDumpState } from '@/components/brain-dump/brain-dump-input';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { trpc } from '@/lib/trpc';
import {
  clearBrainDumpDraft,
  getBrainDumpDraft,
  setBrainDumpDraft,
  type BrainDumpCheckState,
  type BrainDumpDraft,
} from '@/services/brain-dump-draft';
import { createTasksFromBrainDump } from '@/services/tasks-repository';
import { useQuickAddStore } from '@/stores/quick-add-store';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

/** Loading treatment fades in only after this delay — no flash on fast parses (AC2). */
const SPINNER_DELAY_MS = 1_000;
/** Past this, the "Taking a bit longer..." line escalates the copy (AC3). */
const LONG_PARSE_MS = 4_000;
/** Draft autosave debounce — covers process death; back paths flush directly. */
const DRAFT_SAVE_DEBOUNCE_MS = 400;

/**
 * Brain dump screen (Story 6.1 → v1.5 D6 gate): the dump parses into a CHECK
 * stage — one box per task with its evidence quotes, unclaimed lines as
 * promotable dashed rows — and NOTHING saves until `Add N tasks`. All AI
 * calls go through the server's tRPC seam, never directly to Gemini.
 *
 * Leaving the screen (9.8 C1) — back arrow or hardware back — always exits
 * HOME and persists the live stage as a draft (dump text, or the whole parsed
 * check): reopening restores it. Returning from the check to the dump is the
 * `Back to the dump` button's job, and only `Add N tasks` clears the draft.
 */
export default function BrainDumpScreen() {
  const router = useRouter();
  const [state, setState] = useState<BrainDumpState>('idle');
  const [text, setText] = useState('');
  const [check, setCheck] = useState<BrainDumpCheckState | null>(null);
  const [working, setWorking] = useState(false);
  // 9.8 G9: a locally promoted line opens its (empty) title for typing.
  const [autoEditIndex, setAutoEditIndex] = useState<number | null>(null);
  const parseMutation = trpc.ai.parseBrainDump.useMutation();

  // ── Draft persistence (9.8 C1) ─────────────────────────────────────────
  // Hydrate once; saves are gated on it so an empty first render can't
  // clobber a stored draft before the read lands.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void getBrainDumpDraft(db)
      .catch(() => null)
      .then((draft) => {
        if (cancelled) return;
        if (draft) {
          setText(draft.text);
          if (draft.check && draft.check.tasks.length + draft.check.unclaimed.length > 0) {
            setCheck(draft.check);
          }
        }
        setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced autosave while the screen lives (covers process death)...
  const latestDraftRef = useRef<BrainDumpDraft>({ text: '', check: null });
  latestDraftRef.current = { text, check };
  const hydratedRef = useRef(false);
  hydratedRef.current = hydrated;
  const draftClearedRef = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      if (!draftClearedRef.current) void setBrainDumpDraft(db, latestDraftRef.current);
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, check, hydrated]);

  // ...and a final flush on unmount — the hardware-back path never sees the
  // in-app back handler, so the write has to ride the teardown.
  useEffect(
    () => () => {
      if (!hydratedRef.current || draftClearedRef.current) return;
      void setBrainDumpDraft(db, latestDraftRef.current);
    },
    [],
  );

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

  // 9.8 G8/G9: promoting is LOCAL now — no AI round trip. A line whose task
  // was dropped earlier restores that draft (and consumes the draft's other
  // lines); a never-claimed line becomes an empty-title box with the title
  // focused for typing (the AI already failed to claim it once).
  const handlePromote = (line: string) => {
    setCheck((previous) => {
      if (!previous) return previous;
      const dropped = previous.droppedDrafts?.[line];
      if (dropped) {
        const consumed = new Set(dropped.evidence.length > 0 ? dropped.evidence : [dropped.title]);
        const remainingDropped = Object.fromEntries(
          Object.entries(previous.droppedDrafts ?? {}).filter(([key]) => !consumed.has(key)),
        );
        track('brain_dump_line_promoted', { via: 'restored' });
        return {
          tasks: [...previous.tasks, dropped],
          unclaimed: previous.unclaimed.filter((candidate) => !consumed.has(candidate)),
          droppedDrafts: remainingDropped,
        };
      }
      track('brain_dump_line_promoted', { via: 'manual' });
      setAutoEditIndex(previous.tasks.length);
      return {
        ...previous,
        tasks: [
          ...previous.tasks,
          {
            title: '',
            details: null,
            size: null,
            contexts: [],
            deadline: null,
            timeSensitive: false,
            evidence: [line],
          },
        ],
        unclaimed: previous.unclaimed.filter((candidate) => candidate !== line),
      };
    });
  };

  const handleAddAll = async () => {
    const drafts = check?.tasks ?? [];
    if (drafts.length === 0) return;
    const created = await createTasksFromBrainDump(db, drafts);
    track('brain_dump_tasks_added', {
      task_count: created.length,
      not_added_count: check?.unclaimed.length ?? 0,
    });
    // The one path that CLEARS the draft — the work landed as tasks.
    draftClearedRef.current = true;
    await clearBrainDumpDraft(db);
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
          aria-label="Close brain dump"
          hitSlop={8}
          onPress={() => {
            // 9.8 C1: back always exits HOME, saving the live stage as a
            // draft (the unmount flush writes it). Returning to the dump
            // from the check is the `Back to the dump` button's job.
            close();
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
          autoEditIndex={autoEditIndex}
          onAutoEditHandled={() => setAutoEditIndex(null)}
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
            // 9.8 C2: a dropped task doesn't vanish — its source lines return
            // to the unclaimed "not added" rows (re-promotable, honest count).
            // G8: the draft itself is kept, keyed by those lines, so re-adding
            // restores it instantly.
            setCheck((previous) => {
              if (!previous) return previous;
              const dropped = previous.tasks[index];
              const lines =
                dropped === undefined
                  ? []
                  : dropped.evidence.length > 0
                    ? dropped.evidence
                    : [dropped.title];
              const fresh = lines.filter((line) => !previous.unclaimed.includes(line));
              const keyed =
                dropped === undefined
                  ? {}
                  : Object.fromEntries(lines.map((line) => [line, dropped]));
              return {
                tasks: previous.tasks.filter((_, candidate) => candidate !== index),
                unclaimed: [...previous.unclaimed, ...fresh],
                droppedDrafts: { ...previous.droppedDrafts, ...keyed },
              };
            })
          }
          onPromote={handlePromote}
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
