import type { LocalTask } from '@one-down/shared/schema-local';
import type { TaskContext } from '@one-down/shared/schema-local';

export function curateTasks(tasks: LocalTask[], activeContexts?: TaskContext[]): LocalTask[] {
  let filtered = tasks.filter((t) => t.status === 'pending');

  if (activeContexts && activeContexts.length > 0) {
    filtered = filtered.filter((t) => {
      if (!t.contexts) return true;
      const taskContexts: string[] = JSON.parse(t.contexts);
      return activeContexts.some((c) => taskContexts.includes(c));
    });
  }

  return filtered.sort((a, b) => {
    const aDeadline = a.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bDeadline = b.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (aDeadline !== bDeadline) return aDeadline - bDeadline;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
