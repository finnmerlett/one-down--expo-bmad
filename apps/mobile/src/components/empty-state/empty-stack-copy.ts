import type { TaskContext, TaskSize } from '@one-down/shared';

import { CONTEXT_LABELS } from '@/components/card-stack/task-card';

/**
 * Contextual copy for the filtered-empty stack (Story 3.4 AC1, UX DR13):
 * names the active filter(s) and suggests the way out — dropping the
 * irrelevant half of the suggestion when only one filter type is active.
 * Callers only reach this with at least one filter active.
 */
export function emptyStackCopy(
  activeContexts: TaskContext[],
  mode: TaskSize | null,
): { title: string; body: string } {
  const [firstContext] = activeContexts;
  const singleContext = activeContexts.length === 1 ? firstContext : undefined;
  const modeNoun = mode === 'quick_win' ? 'quick wins' : 'big time tasks';

  let title: string;
  if (mode && activeContexts.length > 0) {
    title = singleContext
      ? `No ${modeNoun} for ${CONTEXT_LABELS[singleContext]}`
      : `No ${modeNoun} for these contexts`;
  } else if (mode) {
    title = `No ${modeNoun} right now`;
  } else if (singleContext) {
    title = `Nothing here for ${CONTEXT_LABELS[singleContext]}`;
  } else {
    title = 'Nothing for these contexts';
  }

  const body =
    mode && activeContexts.length > 0
      ? 'Try another context or switch mode.'
      : mode
        ? 'Try switching mode.'
        : 'Try another context.';

  return { title, body };
}
