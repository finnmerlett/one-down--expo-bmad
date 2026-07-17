import { TRPCClientError } from '@trpc/client';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { BreakdownMode, TaskData } from '@one-down/shared';

import { track } from '@/lib/analytics/track';
import { trpc } from '@/lib/trpc';
import { acceptBreakdown } from '@/services/subtask-actions';

/**
 * Minimum time the loading treatment stays up. The local fake provider
 * answers in tens of ms — without a floor the "Breaking this down..." state
 * is gone before a human (or Maestro's hierarchy poll) can see it.
 */
export const MIN_BREAKDOWN_LOADING_MS = 500;

export type BreakdownRequestVia = 'task_running' | 'card_back';

/**
 * Breakdown lifecycle owned by the task-running route (Story 6.3); the view
 * stays presentational and just renders this controller. The proposal lives
 * in local state — nothing persists until `accept()`.
 */
export interface BreakdownController {
  state: 'idle' | 'loading' | 'proposal' | 'error';
  steps: string[];
  mode: BreakdownMode;
  request: (mode: BreakdownMode, via: BreakdownRequestVia) => void;
  /** Re-fires the last request (inline error retry). */
  retry: () => void;
  accept: () => void;
  reject: () => void;
}

interface Snapshot {
  state: BreakdownController['state'];
  steps: string[];
  mode: BreakdownMode;
}

const IDLE: Snapshot = { state: 'idle', steps: [], mode: 'first_steps' };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useBreakdown(task: TaskData | null): BreakdownController {
  const mutation = trpc.ai.breakdownTask.useMutation();
  const [snapshot, setSnapshot] = useState<Snapshot>(IDLE);

  // Refs so `request` stays referentially stable (the route's auto-fire
  // effect depends on it) while always reading the freshest task/state.
  const taskRef = useRef(task);
  const snapshotRef = useRef(snapshot);
  const lastRequestRef = useRef<{ mode: BreakdownMode; via: BreakdownRequestVia } | null>(null);
  useEffect(() => {
    taskRef.current = task;
    snapshotRef.current = snapshot;
  });

  const mutateAsync = mutation.mutateAsync;
  const request = useCallback(
    (mode: BreakdownMode, via: BreakdownRequestVia) => {
      const current = taskRef.current;
      if (!current || snapshotRef.current.state === 'loading') return;
      lastRequestRef.current = { mode, via };
      track('breakdown_requested', { via, mode });
      setSnapshot((previous) => ({ ...previous, state: 'loading', mode }));
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
          setSnapshot({ state: 'proposal', steps: result.steps, mode: result.mode });
        })
        .catch((error: unknown) => {
          const reason =
            error instanceof TRPCClientError && error.data != null ? 'server_error' : 'network';
          track('breakdown_failed', { reason });
          setSnapshot((previous) => ({ ...previous, state: 'error' }));
        });
    },
    [mutateAsync],
  );

  const retry = useCallback(() => {
    const last = lastRequestRef.current;
    if (last) request(last.mode, last.via);
  }, [request]);

  const accept = useCallback(() => {
    const current = taskRef.current;
    const { state, steps, mode } = snapshotRef.current;
    if (!current || state !== 'proposal') return;
    acceptBreakdown(current.id, steps, mode);
    setSnapshot(IDLE);
  }, []);

  const reject = useCallback(() => {
    track('breakdown_rejected', { step_count: snapshotRef.current.steps.length });
    setSnapshot(IDLE);
  }, []);

  return { ...snapshot, request, retry, accept, reject };
}
