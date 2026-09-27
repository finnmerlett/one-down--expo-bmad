import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  parseReviewFlags,
  parseTaskContexts,
  type ReviewItem,
  type TaskData,
} from '@one-down/shared';

import { showRewardToast, showUndoToast } from '@/components/feedback/reward-toast';
import { SIZE_LABELS } from '@/components/card-stack/task-card';
import type { BlueprintDraft } from '@/components/triage/blueprint-card';
import { CheckQueueScreen } from '@/components/triage/check-queue-screen';
import { useToast } from '@/components/ui/toast';
import { useStarTotals } from '@/hooks/use-star-totals';
import { useTasks } from '@/hooks/use-tasks';
import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { appendAiLearning } from '@/services/ai-notes';
import { applyTaskPatch, confirmReviewItem, confirmReviewItems } from '@/services/task-edits';
import { archiveTasks, restoreTask, type UpdateTaskPatch } from '@/services/tasks-repository';

// Data + behaviour for the check queue; everything visible is CheckQueueScreen.
export default function CheckQueueRoute() {
  const router = useRouter();
  const tasks = useTasks();
  const toast = useToast();
  const starTotals = useStarTotals();

  // 9-5 item 11: the queue-clear +5 pays through the standard reward toast —
  // same anatomy as "One down!", triage wording. Fired by the edit services
  // only when the award actually lands (self-gated: queue empty + once/day).
  const handleQueueCleared = (amount: number) => {
    showRewardToast(toast, {
      title: 'Triage cleared',
      stars: amount,
      total: starTotals.total + amount,
      celebrate: true,
      // Once-a-day celebration firing over the queue-clear transition — the
      // default 2s died inside the fly-up/mount churn (and inside Maestro's
      // tap-settle window). Same 5s beat as the undoable completion toast.
      durationMs: 5000,
    });
  };

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
    if (draft.criticality !== task.criticality) patch.criticality = draft.criticality;
    if (JSON.stringify(draft.contexts) !== JSON.stringify(parseTaskContexts(task.contexts))) {
      patch.contexts = draft.contexts;
    }
    if ((draft.deadline?.getTime() ?? null) !== (task.deadline?.getTime() ?? null)) {
      patch.deadline = draft.deadline;
    }
    const editedFields = Object.keys(patch);
    if (editedFields.length > 0) applyTaskPatch(task, patch, handleQueueCleared);

    // 9-5 item 8: correcting an AI-guessed size teaches the AI what kind of
    // task is a quick win vs big time — one compact bullet in the general
    // notes (local, PII-free analytics).
    const guessedSize = (parseReviewFlags(task.reviewFlags)?.inferred ?? []).includes('size');
    if (patch.size !== undefined && guessedSize) {
      const label = (size: typeof task.size) => (size ? SIZE_LABELS[size] : 'unsized');
      void appendAiLearning(
        db,
        `Sized "${task.title}" as ${label(patch.size ?? null)} (we guessed ${label(task.size)})`,
        'triage',
      )
        // oxlint-disable-next-line no-console
        .catch((error: unknown) => console.warn('AI learning save failed', error));
    }

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
    if (remaining.length === 1 && remaining[0]) {
      confirmReviewItem(task, remaining[0], handleQueueCleared);
    } else if (remaining.length > 1) {
      confirmReviewItems(task, remaining, handleQueueCleared);
    }

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

  // 9.8 G11: bin from triage — recycle bin (archived), NO award, undoable.
  const handleDelete = (task: TaskData) => {
    void archiveTasks(db, [task.id])
      // oxlint-disable-next-line no-console
      .catch((error: unknown) => console.warn('Triage delete failed', error));
    track('triage_card_deleted', {});
    setHandledIds((previous) => new Set(previous).add(task.id));
    showUndoToast(toast, {
      title: 'Sent to the recycle bin',
      onUndo: () => {
        void restoreTask(db, task.id)
          // oxlint-disable-next-line no-console
          .catch((error: unknown) => console.warn('Triage delete undo failed', error));
        // Back into this session's queue — it is still flagged.
        setHandledIds((previous) => {
          const next = new Set(previous);
          next.delete(task.id);
          return next;
        });
      },
    });
  };

  return (
    <CheckQueueScreen
      current={current}
      position={position}
      total={total}
      handledCount={handledIds.size}
      onSave={handleSave}
      onSkip={handleSkip}
      onDelete={handleDelete}
      onBack={() => router.back()}
    />
  );
}
