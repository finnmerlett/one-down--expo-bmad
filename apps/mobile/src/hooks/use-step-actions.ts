import { useCallback, useEffect, useRef, useState } from 'react';
import { TRPCClientError } from '@trpc/client';

import { inArray } from 'drizzle-orm';
import { subtasks as subtasksTable } from '@one-down/shared/schema-local';
import type { SubtaskData, TaskData } from '@one-down/shared';

import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { trpc } from '@/lib/trpc';
import { appendDiff, diffSteps, type StepDiff } from '@/services/step-diff';
import { createSubtasks, replaceUncompletedSubtasks } from '@/services/subtasks-repository';
import { appendAiLearning, getAiGeneralNotes } from '@/services/ai-notes';
import { appendDistillationToNotes, applyTaskPatch } from '@/services/task-edits';

/** Floor on the working state so the button's spinner never flickers. */
const MIN_WORKING_MS = 500;

export type StepActionKind = 'more' | 'change';

/** The label-line report (05e): what the last AI action did, with its Undo. */
export interface StepChangeReport extends StepDiff {
  kind: StepActionKind;
}

/**
 * The v1.5 step actions (design Row B, D4): `Get more steps` and
 * `Change these` write their results DIRECTLY — nothing is promised until it
 * lands, and the report line + Undo take the place of the old
 * proposal/accept ceremony. Completed steps are never touched; nothing is
 * ever inserted above one.
 */
export interface StepActionsController {
  state: 'idle' | 'working' | 'error';
  /** Which action is in flight / failed (styles the right button). */
  kind: StepActionKind | null;
  errorReason: 'network' | 'server_error' | null;
  /** Set after a successful action until the screen leaves or the next one. */
  report: StepChangeReport | null;
  /** Zero steps → the first 3; otherwise 3 more or a subdivision (server decides). */
  getMoreSteps: () => void;
  changeThese: (feedback: string) => void;
  retry: () => void;
  undo: () => void;
  clearReport: () => void;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function failureReason(error: unknown): 'network' | 'server_error' {
  return error instanceof TRPCClientError && error.data != null ? 'server_error' : 'network';
}

interface UndoPlan {
  kind: 'delete-created' | 'restore-uncompleted';
  createdIds: string[];
  priorUncompletedTitles: string[];
}

export function useStepActions(
  task: TaskData | null,
  subtasks: SubtaskData[] = [],
): StepActionsController {
  const breakdownMutation = trpc.ai.breakdownTask.useMutation();
  const moreMutation = trpc.ai.moreSteps.useMutation();
  const changeMutation = trpc.ai.refineBreakdown.useMutation();

  const [state, setState] = useState<StepActionsController['state']>('idle');
  const [kind, setKind] = useState<StepActionKind | null>(null);
  const [errorReason, setErrorReason] = useState<'network' | 'server_error' | null>(null);
  const [report, setReport] = useState<StepChangeReport | null>(null);

  // Refs keep the callbacks referentially stable for the route's auto-fire
  // effect while always reading the freshest inputs.
  const taskRef = useRef(task);
  const subtasksRef = useRef(subtasks);
  const stateRef = useRef(state);
  const undoPlanRef = useRef<UndoPlan | null>(null);
  const lastActionRef = useRef<{ kind: StepActionKind; feedback?: string } | null>(null);
  useEffect(() => {
    taskRef.current = task;
    subtasksRef.current = subtasks;
    stateRef.current = state;
  });

  const breakdownAsync = breakdownMutation.mutateAsync;
  const moreAsync = moreMutation.mutateAsync;
  const changeAsync = changeMutation.mutateAsync;

  const getMoreSteps = useCallback(() => {
    const current = taskRef.current;
    if (!current || stateRef.current === 'working') return;
    lastActionRef.current = { kind: 'more' };
    setState('working');
    setKind('more');
    setReport(null);
    const startedAt = Date.now();
    const existing = subtasksRef.current;
    const priorUncompleted = existing
      .filter((subtask) => !subtask.completed)
      .map((subtask) => subtask.title);

    const run = async () => {
      // 9-5 item 4: the user's general AI notes ride along as prompt context.
      const generalNotes = (await getAiGeneralNotes(db).catch(() => '')) || null;
      if (existing.length === 0) {
        // First ask: the classic 3 starters — same server contract as 6.3.
        const [result] = await Promise.all([
          breakdownAsync({
            title: current.title,
            details: current.details,
            notes: current.notes,
            generalNotes,
            mode: 'first_steps',
          }),
          delay(MIN_WORKING_MS),
        ]);
        const created = await createSubtasks(db, current.id, result.steps, 'ai');
        undoPlanRef.current = {
          kind: 'delete-created',
          createdIds: created.map((row) => row.id),
          priorUncompletedTitles: [],
        };
        track('steps_grown', {
          mode: 'first',
          step_count: result.steps.length,
          duration_ms: Date.now() - startedAt,
          provider: result.provider,
        });
        return appendDiff(created.map((row) => row.title));
      }

      const [result] = await Promise.all([
        moreAsync({
          title: current.title,
          details: current.details,
          notes: current.notes,
          generalNotes,
          subtasks: existing.map((subtask) => ({
            title: subtask.title,
            completed: subtask.completed,
          })),
        }),
        delay(MIN_WORKING_MS),
      ]);
      if (result.mode === 'appended') {
        const created = await createSubtasks(db, current.id, result.steps, 'ai');
        undoPlanRef.current = {
          kind: 'delete-created',
          createdIds: created.map((row) => row.id),
          priorUncompletedTitles: [],
        };
        track('steps_grown', {
          mode: 'appended',
          step_count: result.steps.length,
          duration_ms: Date.now() - startedAt,
          provider: result.provider,
        });
        return appendDiff(created.map((row) => row.title));
      }
      await replaceUncompletedSubtasks(db, current.id, result.steps, 'ai');
      undoPlanRef.current = {
        kind: 'restore-uncompleted',
        createdIds: [],
        priorUncompletedTitles: priorUncompleted,
      };
      track('steps_grown', {
        mode: 'subdivided',
        step_count: result.steps.length,
        duration_ms: Date.now() - startedAt,
        provider: result.provider,
      });
      return diffSteps(priorUncompleted, result.steps);
    };

    void run()
      .then((diff) => {
        setState('idle');
        setKind(null);
        setErrorReason(null);
        setReport({ kind: 'more', ...diff });
      })
      .catch((error: unknown) => {
        setState('error');
        setErrorReason(failureReason(error));
        track('steps_grow_failed', { reason: failureReason(error) });
      });
  }, [breakdownAsync, moreAsync]);

  const changeThese = useCallback(
    (feedback: string) => {
      const current = taskRef.current;
      const trimmed = feedback.trim();
      if (!current || !trimmed || stateRef.current === 'working') return;
      lastActionRef.current = { kind: 'change', feedback: trimmed };
      setState('working');
      setKind('change');
      setReport(null);
      const startedAt = Date.now();
      const existing = subtasksRef.current;
      const priorUncompleted = existing
        .filter((subtask) => !subtask.completed)
        .map((subtask) => subtask.title);

      const run = async () => {
        // 9-5 item 4: general AI notes as prompt context.
        const generalNotes = (await getAiGeneralNotes(db).catch(() => '')) || null;
        const [result] = await Promise.all([
          changeAsync({
            title: current.title,
            details: current.details,
            notes: current.notes,
            generalNotes,
            feedback: trimmed,
            subtasks: existing.map((subtask) => ({
              title: subtask.title,
              completed: subtask.completed,
            })),
          }),
          delay(MIN_WORKING_MS),
        ]);
        // Durable facts land in the notes immediately (6.4 semantics kept) —
        // read the FRESHEST task so a mid-flight autosave isn't overwritten.
        if (result.notesDistillation) {
          const latest = taskRef.current ?? current;
          applyTaskPatch(latest, {
            notes: appendDistillationToNotes(latest.notes, result.notesDistillation),
          });
        }
        // 9-5 item 4: a durable fact about the USER lands in the general AI
        // notes (fire-and-forget — never blocks the step swap).
        if (result.generalLearning) {
          void appendAiLearning(db, result.generalLearning, 'refine')
            // oxlint-disable-next-line no-console
            .catch((error: unknown) => console.warn('AI learning save failed', error));
        }
        await replaceUncompletedSubtasks(db, current.id, result.steps, 'ai');
        undoPlanRef.current = {
          kind: 'restore-uncompleted',
          createdIds: [],
          priorUncompletedTitles: priorUncompleted,
        };
        track('steps_changed', {
          step_count: result.steps.length,
          feedback_chars: trimmed.length,
          duration_ms: Date.now() - startedAt,
          provider: result.provider,
        });
        return diffSteps(priorUncompleted, result.steps);
      };

      void run()
        .then((diff) => {
          setState('idle');
          setKind(null);
          setErrorReason(null);
          setReport({ kind: 'change', ...diff });
        })
        .catch((error: unknown) => {
          setState('error');
          setErrorReason(failureReason(error));
          track('steps_change_failed', { reason: failureReason(error) });
        });
    },
    [changeAsync],
  );

  const retry = useCallback(() => {
    const last = lastActionRef.current;
    if (!last) return;
    setState('idle');
    if (last.kind === 'more') getMoreSteps();
    else if (last.feedback) changeThese(last.feedback);
  }, [getMoreSteps, changeThese]);

  const undo = useCallback(() => {
    const plan = undoPlanRef.current;
    const current = taskRef.current;
    if (!plan || !current) return;
    undoPlanRef.current = null;
    setReport(null);
    track('steps_change_undone', { kind: plan.kind });
    if (plan.kind === 'delete-created') {
      if (plan.createdIds.length === 0) return;
      void db
        .delete(subtasksTable)
        .where(inArray(subtasksTable.id, plan.createdIds))
        // oxlint-disable-next-line no-console
        .catch((error: unknown) => console.warn('Step undo failed', error));
      return;
    }
    void replaceUncompletedSubtasks(db, current.id, plan.priorUncompletedTitles, 'ai')
      // oxlint-disable-next-line no-console
      .catch((error: unknown) => console.warn('Step undo failed', error));
  }, []);

  const clearReport = useCallback(() => {
    setReport(null);
    undoPlanRef.current = null;
  }, []);

  return { state, kind, errorReason, report, getMoreSteps, changeThese, retry, undo, clearReport };
}
