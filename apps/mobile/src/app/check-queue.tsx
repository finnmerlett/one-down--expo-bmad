import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import { cssInterop } from 'nativewind';

import {
  parseReviewFlags,
  parseTaskContexts,
  type ReviewItem,
  type TaskData,
} from '@one-down/shared';

import { BlueprintCard, type BlueprintDraft } from '@/components/triage/blueprint-card';
import { Box } from '@/components/ui/box';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useTasks } from '@/hooks/use-tasks';
import { track } from '@/lib/analytics/track';
import { applyTaskPatch, confirmReviewItem, confirmReviewItems } from '@/services/task-edits';
import type { UpdateTaskPatch } from '@/services/tasks-repository';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

const GROUND = '#16283F';
const RAIL_DONE = '#A6C8EE';

/** 26px blueprint grid (spec §9) — one static SVG under everything. */
function GridGround() {
  const { width, height } = Dimensions.get('window');
  const step = 26;
  const stroke = 'rgba(160,200,245,0.055)';
  const columns = Array.from({ length: Math.ceil(width / step) }, (_, index) => index * step);
  const rows = Array.from({ length: Math.ceil(height / step) }, (_, index) => index * step);
  return (
    <Box pointerEvents="none" className="absolute inset-0">
      <Svg width={width} height={height}>
        {columns.map((x) => (
          <Line key={`c${x}`} x1={x} y1={0} x2={x} y2={height} stroke={stroke} strokeWidth={1} />
        ))}
        {rows.map((y) => (
          <Line key={`r${y}`} x1={0} y1={y} x2={width} y2={y} stroke={stroke} strokeWidth={1} />
        ))}
      </Svg>
    </Box>
  );
}

/**
 * Blueprint triage (v1.5 Row D, header reads `Triage`): the check queue —
 * every active task still carrying review items — as editable dashed cards
 * over the #16283F grid. `Save and next` commits the card's draft (edited
 * fields clear their own flags; everything left is confirmed as shown);
 * `Skip this one` sends it to the queue's end without clearing anything.
 * Emptying the queue pays the +5 once/day (wired inside the edit services).
 *
 * The 7.3 welcome-back triage at /triage stays its own surface (ambiguity
 * #41) — this screen replaces Story 6.2's review MODE, not that list.
 */
export default function CheckQueueScreen() {
  const router = useRouter();
  const tasks = useTasks();

  // Session-local ordering: saved cards leave, skipped cards sink to the end.
  const [handledIds, setHandledIds] = useState<ReadonlySet<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<readonly string[]>([]);

  const queue = useMemo(() => {
    const flagged = tasks.filter(
      (task) =>
        task.hasCheckNeeded &&
        (task.status === 'pending' || task.status === 'in_progress') &&
        !handledIds.has(task.id),
    );
    // Newest first (ambiguity #41), skipped cards after everything else in
    // the order they were skipped.
    const fresh = flagged
      .filter((task) => !skippedIds.includes(task.id))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const skipped = skippedIds
      .map((id) => flagged.find((task) => task.id === id))
      .filter((task): task is TaskData => task !== undefined);
    return [...fresh, ...skipped];
  }, [tasks, handledIds, skippedIds]);

  // The session's total: fixed on entry so `2 / 8` and the rail stay stable
  // as cards are saved (live-query growth mid-session just extends it).
  const totalRef = useRef<number | null>(null);
  if (totalRef.current === null) totalRef.current = queue.length;
  const total = Math.max(totalRef.current, handledIds.size + queue.length);
  const position = Math.min(handledIds.size + 1, Math.max(total, 1));

  const openedCountRef = useRef(queue.length);
  useEffect(() => {
    track('triage_queue_opened', { queue_count: openedCountRef.current });
  }, []);

  const current = queue[0] ?? null;

  const handleSave = (task: TaskData, draft: BlueprintDraft) => {
    // 1. Patch what the user actually changed — the repository clears the
    //    matching flags itself (Story 6.2 'edit' semantics).
    const patch: UpdateTaskPatch = {};
    const trimmedTitle = draft.title.trim();
    if (trimmedTitle && trimmedTitle !== task.title) patch.title = trimmedTitle;
    const trimmedDetails = draft.details.trim();
    if ((trimmedDetails || null) !== (task.details ?? null)) {
      patch.details = trimmedDetails || null;
    }
    if (draft.size !== task.size) patch.size = draft.size;
    if (JSON.stringify(draft.contexts) !== JSON.stringify(parseTaskContexts(task.contexts))) {
      patch.contexts = draft.contexts;
    }
    if ((draft.deadline?.getTime() ?? null) !== (task.deadline?.getTime() ?? null)) {
      patch.deadline = draft.deadline;
    }
    const editedFields = Object.keys(patch);
    if (editedFields.length > 0) applyTaskPatch(task, patch);

    // 2. Everything still flagged is confirmed AS SHOWN — sequentially (the
    //    per-item flag writes race otherwise). A missing deadline clears
    //    only when answered: a date (patched above) or None.
    const flags = parseReviewFlags(task.reviewFlags);
    const remaining: ReviewItem[] = (flags?.inferred ?? []).filter(
      (item) => !editedFields.includes(item === 'deadline' ? 'deadline' : item),
    );
    if (draft.answeredNone && flags?.missingDeadline === true && patch.deadline === undefined) {
      remaining.push('missingDeadline');
    }
    if (remaining.length === 1 && remaining[0]) confirmReviewItem(task, remaining[0]);
    else if (remaining.length > 1) confirmReviewItems(task, remaining);

    track('triage_card_saved', {
      edited_fields: editedFields.length,
      confirmed_count: remaining.length,
    });
    setHandledIds((previous) => new Set(previous).add(task.id));
  };

  const handleSkip = (task: TaskData) => {
    track('triage_card_skipped', {});
    setSkippedIds((previous) => [...previous.filter((id) => id !== task.id), task.id]);
    // Force re-order even when this card was already at the end.
    setHandledIds((previous) => new Set(previous));
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      className="flex-1"
      style={{ backgroundColor: GROUND }}
    >
      <GridGround />
      <HStack className="items-center gap-1 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Back to home"
          hitSlop={8}
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full"
        >
          <Icon as={ArrowLeftIcon} size="xl" style={{ color: '#F2F7FD' }} />
        </Pressable>
        <Text className="font-heading text-2xl" style={{ color: '#F2F7FD' }}>
          Triage
        </Text>
        <Box className="flex-1" />
        {total > 0 ? (
          <Text className="pr-2 font-mono text-[13px]" style={{ color: RAIL_DONE }}>
            {`${position} / ${total}`}
          </Text>
        ) : null}
      </HStack>
      {/* Segmented progress rail (4px bars) + the pay line. */}
      <VStack className="gap-2 px-6 pb-3">
        {total > 0 ? (
          <HStack className="gap-1">
            {Array.from({ length: total }, (_, index) => (
              <Box
                key={index}
                className="h-1 flex-1 rounded-full"
                style={{
                  backgroundColor: index < position - 1 ? RAIL_DONE : 'rgba(160,200,245,0.25)',
                }}
              />
            ))}
          </HStack>
        ) : null}
        <Text
          className="font-mono text-[11px] uppercase tracking-caps"
          style={{ color: 'rgba(160,200,245,0.7)' }}
        >
          Clear the queue · ★ 5
        </Text>
      </VStack>
      {current ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-6 pb-10">
          <BlueprintCard
            key={current.id}
            task={current}
            onSave={(draft) => handleSave(current, draft)}
            onSkip={() => handleSkip(current)}
          />
        </ScrollView>
      ) : (
        <VStack className="flex-1 items-center justify-center gap-3 px-8">
          <Text className="text-[40px]">★</Text>
          <Text className="text-center font-heading text-2xl" style={{ color: '#F2F7FD' }}>
            Queue clear
          </Text>
          <Text className="text-center font-body text-sm" style={{ color: RAIL_DONE }}>
            Every guess has been checked. Nice one.
          </Text>
          <Pressable
            accessibilityRole="button"
            aria-label="Back to the deck"
            onPress={() => router.back()}
            className="mt-3 h-11 items-center justify-center rounded-full px-6"
            style={{ backgroundColor: '#49BAB9' }}
          >
            <Text className="font-body-bold text-sm text-typography-0">Back to the deck</Text>
          </Pressable>
        </VStack>
      )}
    </SafeAreaView>
  );
}
