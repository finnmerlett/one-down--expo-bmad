import type { LocalTask } from '@one-down/shared/schema-local';
import { TASK_CONTEXTS, type TaskContext } from '@one-down/shared/schema-local';

import { Badge } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';

const CONTEXT_LABELS: Record<TaskContext, string> = {
  home: 'Home',
  out_and_about: 'Out & About',
  phone: 'Phone',
  laptop: 'Laptop',
  internet: 'Internet',
};

const SIZE_LABELS: Record<string, string> = {
  quick_win: 'Quick Win',
  big_time: 'Big Time',
};

function parseContexts(raw: string | null): TaskContext[] {
  if (!raw) return [];
  try {
    const parsed: string[] = JSON.parse(raw);
    return parsed.filter((c): c is TaskContext => (TASK_CONTEXTS as readonly string[]).includes(c));
  } catch {
    return [];
  }
}

export type TaskCardProps = {
  task: LocalTask;
};

export function TaskCard({ task }: TaskCardProps) {
  const contexts = parseContexts(task.contexts);
  const sizeLabel = task.size ? SIZE_LABELS[task.size] : null;

  return (
    <Box
      className="w-full rounded-2xl border border-neutral-200 bg-white p-5 shadow-md"
      accessibilityLabel={`Task: ${task.title}`}
      accessibilityRole="summary"
    >
      {task.hasCheckNeeded && (
        <Text className="mb-1 text-sm text-amber-600" accessibilityLabel="Needs confirmation">
          !
        </Text>
      )}

      <Text className="text-xl font-bold text-neutral-900">{task.title}</Text>

      {(sizeLabel || contexts.length > 0) && (
        <Box className="mt-3 flex-row flex-wrap gap-2">
          {sizeLabel && (
            <Badge
              className={task.size === 'quick_win' ? 'bg-green-100' : 'bg-orange-100'}
              accessibilityLabel={`Size: ${sizeLabel}`}
            >
              <Text
                className={`text-xs font-medium ${task.size === 'quick_win' ? 'text-green-800' : 'text-orange-800'}`}
              >
                {sizeLabel}
              </Text>
            </Badge>
          )}
          {contexts.map((ctx) => (
            <Badge
              key={ctx}
              className="bg-blue-100"
              accessibilityLabel={`Context: ${CONTEXT_LABELS[ctx]}`}
            >
              <Text className="text-xs font-medium text-blue-800">{CONTEXT_LABELS[ctx]}</Text>
            </Badge>
          ))}
        </Box>
      )}

      {task.deadline && (
        <Text className="mt-2 text-xs text-neutral-500" accessibilityLabel="Has deadline">
          Deadline set
        </Text>
      )}
    </Box>
  );
}
