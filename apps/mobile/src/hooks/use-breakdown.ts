import { TRPCClientError } from '@trpc/client';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { BreakdownMode, SubtaskData, TaskData } from '@one-down/shared';

import { track } from '@/lib/analytics/track';
import { trpc } from '@/lib/trpc';
import { acceptBreakdown, acceptRefinedBreakdown } from '@/services/subtask-actions';
import { appendDistillationToNotes, applyTaskPatch } from '@/services/task-edits';

/**
 * Minimum time the loading treatment stays up. The local fake provider
 * answers in tens of ms — without a floor the "Breaking this down..." state
 * is gone before a human (or Maestro's hierarchy poll) can see it.
 */
export const MIN_BREAKDOWN_LOADING_MS = 500;

export type BreakdownRequestVia = 'task_running' | 'card_back';

/**
 * Breakdown lifecycle owned by the task-running route (Story 6.3; refine —
 * Story 6.4); the view stays presentational and just renders this controller.
 * The proposal lives in local state — nothing persists until `accept()`
 * (except a refine's notes distillation, which is useful either way — AC4).
 */
export interface BreakdownController {
  state: 'idle' | 'loading' | 'proposal' | 'error';
  steps: string[];
  mode: BreakdownMode;
  /** Which flow produced the current loading/proposal ('refine' relabels the UI). */
  via: 'initial' | 'refine';
  request: (mode: BreakdownMode, via: BreakdownRequestVia) => void;
  /** Refine the accepted breakdown from user feedback (Story 6.4). */
  refine: (feedback: string) => void;
  /** Re-fires the last request (inline error retry). */
  retry: () => void;
  accept: () => void;
  reject: () => void;
}

interface Snapshot {
  state: BreakdownController['state'];
  steps: string[];
  mode: BreakdownMode;
  via: 'initial' | 'refine';
}

const IDLE: Snapshot = { state: 'idle', steps: [], mode: 'first_steps', via: 'initial' };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function failureReason(error: unknown): 'network' | 'server_error' {
  return error instanceof TRPCClientError && error.data != null ? 'server_error' : 'network';
}

export function useBreakdown(
  task: TaskData | null,
  subtasks: SubtaskData[] = [],
): BreakdownController {
  const mutation = trpc.ai.breakdownTask.useMutation();
  const refineMutation = trpc.ai.refineBreakdown.useMutation();
  const [snapshot, setSnapshot] = useState<Snapshot>(IDLE);

  // Refs so the callbacks stay referentially stable (the route's auto-fire
  // effect depends on `request`) while always reading the freshest inputs.
  const taskRef = useRef(task);
  const subtasksRef = useRef(subtasks);
  const snapshotRef = useRef(snapshot);
  const lastRequestRef = useRef<
    | { kind: 'initial'; mode: BreakdownMode; via: BreakdownRequestVia }
    | { kind: 'refine'; feedback: string }
    | null
  >(null);
  useEffect(() => {
    taskRef.current = task;
    subtasksRef.current = subtasks;
    snapshotRef.current = snapshot;
  });

  const mutateAsync = mutation.mutateAsync;
  const request = useCallback(
    (mode: BreakdownMode, via: BreakdownRequestVia) => {
      const current = taskRef.current;
      if (!current || snapshotRef.current.state === 'loading') return;
      lastRequestRef.current = { kind: 'initial', mode, via };
      track('breakdown_requested', { via, mode });
      setSnapshot((previous) => ({ ...previous, state: 'loading', mode, via: 'initial' }));
      const startedAt = Date.now();
      void Promise.all([
        mutateAsync({
          title: current.title,
          details: current.details,
          notes: current.notes,
          mode,
        }),
        delay(MIN_BREAKDOWN_LOADING_MS),
      ])
        .then(([result]) => {
          track('breakdown_generated', {
            step_count: result.steps.length,
            mode: result.mode,
            duration_ms: Date.now() - startedAt,
            provider: result.provider,
          });
          setSnapshot({
            state: 'proposal',
            steps: result.steps,
            mode: result.mode,
            via: 'initial',
          });
        })
        .catch((error: unknown) => {
          track('breakdown_failed', { reason: failureReason(error) });
          setSnapshot((previous) => ({ ...previous, state: 'error' }));
        });
    },
    [mutateAsync],
  );

  const refineMutateAsync = refineMutation.mutateAsync;
  const refine = useCallback(
    (feedback: string) => {
      const current = taskRef.current;
      const trimmed = feedback.trim();
      if (!current || !trimmed || snapshotRef.current.state === 'loading') return;
      lastRequestRef.current = { kind: 'refine', feedback: trimmed };
      // Length only, never the feedback text (NFR-S3).
      track('breakdown_feedback_submitted', { char_count: trimmed.length });
      setSnapshot((previous) => ({ ...previous, state: 'loading', via: 'refine' }));
      const payload = subtasksRef.current.map((subtask) => ({
        title: subtask.title,
        completed: subtask.completed,
      }));
      const startedAt = Date.now();
      void Promise.all([
        refineMutateAsync({
          title: current.title,
          details: current.details,
          notes: current.notes,
          feedback: trimmed,
          subtasks: payload,
        }),
        delay(MIN_BREAKDOWN_LOADING_MS),
      ])
        .then(([result]) => {
          track('breakdown_refined', {
            step_count: result.steps.length,
            kept_completed_count: payload.filter((subtask) => subtask.completed).length,
            has_distillation: result.notesDistillation !== null,
            duration_ms: Date.now() - startedAt,
            provider: result.provider,
          });
          // Distillation lands in the notes IMMEDIATELY, accept or reject —
          // it is useful information either way (AC3/AC4). The running
          // screen's draft-or-stored resync surfaces it live.
          if (result.notesDistillation !== null) {
            const latest = taskRef.current ?? current;
            applyTaskPatch(latest, {
              notes: appendDistillationToNotes(latest.notes, result.notesDistillation),
            });
          }
          setSnapshot((previous) => ({
            ...previous,
            state: 'proposal',
            steps: result.steps,
            via: 'refine',
          }));
        })
        .catch((error: unknown) => {
          track('breakdown_failed', { reason: failureReason(error) });
          setSnapshot((previous) => ({ ...previous, state: 'error' }));
        });
    },
    [refineMutateAsync],
  );

  const retry = useCallback(() => {
    const last = lastRequestRef.current;
    if (!last) return;
    if (last.kind === 'refine') refine(last.feedback);
    else request(last.mode, last.via);
  }, [refine, request]);

  const accept = useCallback(() => {
    const current = taskRef.current;
    const { state, steps, mode, via } = snapshotRef.current;
    if (!current || state !== 'proposal') return;
    if (via === 'refine') {
      acceptRefinedBreakdown(current.id, steps, mode);
    } else {
      acceptBreakdown(current.id, steps, mode);
    }
    setSnapshot(IDLE);
  }, []);

  const reject = useCallback(() => {
    const { steps, via } = snapshotRef.current;
    track('breakdown_rejected', { step_count: steps.length, via });
    setSnapshot(IDLE);
  }, []);

  return { ...snapshot, request, refine, retry, accept, reject };
}
