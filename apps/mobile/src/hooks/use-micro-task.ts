import { useCallback, useEffect, useRef, useState } from 'react';

import type { TaskData } from '@one-down/shared';

import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { trpc } from '@/lib/trpc';
import { getAiGeneralNotes } from '@/services/ai-notes';
import { createSubtasks } from '@/services/subtasks-repository';
import { resetTaskSkips } from '@/services/task-activity';

/**
 * Micro-task nudge lifecycle (Story 6.4, FR39) — owned by the home screen;
 * the nudge chip stays presentational. Accepting saves ONE `source: 'micro'`
 * subtask and resets the skip counter; dismissing just resets (quiet for
 * another threshold's worth of skips).
 */
export interface MicroTaskController {
  state: 'idle' | 'loading' | 'proposal' | 'error';
  step: string | null;
  request: () => void;
  accept: () => void;
  dismiss: () => void;
  retry: () => void;
}

export function useMicroTask(task: TaskData | null): MicroTaskController {
  const mutation = trpc.ai.suggestMicroTask.useMutation();
  const [snapshot, setSnapshot] = useState<{
    state: MicroTaskController['state'];
    step: string | null;
  }>({ state: 'idle', step: null });

  const taskRef = useRef(task);
  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    taskRef.current = task;
    snapshotRef.current = snapshot;
  });

  // A different card on top = a stale suggestion — drop back to the chip.
  const taskId = task?.id ?? null;
  useEffect(() => {
    setSnapshot({ state: 'idle', step: null });
  }, [taskId]);

  const mutateAsync = mutation.mutateAsync;
  const request = useCallback(() => {
    const current = taskRef.current;
    if (!current || snapshotRef.current.state === 'loading') return;
    setSnapshot({ state: 'loading', step: null });
    // 9-5 item 4: general AI notes ride along as prompt context.
    void getAiGeneralNotes(db)
      .catch(() => '')
      .then((generalNotes) =>
        mutateAsync({
          title: current.title,
          details: current.details,
          notes: current.notes,
          generalNotes: generalNotes || null,
        }),
      )
      .then((result) => {
        track('micro_task_suggested', { skip_count: current.skipCount });
        setSnapshot({ state: 'proposal', step: result.step });
      })
      .catch(() => {
        setSnapshot({ state: 'error', step: null });
      });
  }, [mutateAsync]);

  const accept = useCallback(() => {
    const current = taskRef.current;
    const { state, step } = snapshotRef.current;
    if (!current || state !== 'proposal' || !step) return;
    void createSubtasks(db, current.id, [step], 'micro')
      .then(() => {
        track('micro_task_added', { skip_count: current.skipCount });
      })
      // oxlint-disable-next-line no-console
      .catch((error: unknown) => console.warn('Micro task save failed', error));
    resetTaskSkips(current.id);
    setSnapshot({ state: 'idle', step: null });
  }, []);

  const dismiss = useCallback(() => {
    const current = taskRef.current;
    if (!current) return;
    track('micro_task_dismissed', { skip_count: current.skipCount });
    resetTaskSkips(current.id);
    setSnapshot({ state: 'idle', step: null });
  }, []);

  return { ...snapshot, request, accept, dismiss, retry: request };
}
