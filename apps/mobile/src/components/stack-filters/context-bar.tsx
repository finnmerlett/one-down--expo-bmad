import { TASK_CONTEXTS, type TaskContext } from '@one-down/shared';

import { CONTEXT_LABELS } from '@/components/card-stack/task-card';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

import { BlockArrow } from './block-arrow';
import { CONTEXT_ICONS } from './context-icons';

// Resolved ink hexes for the SVG arrow (tokens are className-only).
const INK = '#2C2723';

/**
 * Collapsed context bar (v1.5 frames 02/E7): `Right now →` + glyphs of the
 * SELECTED contexts + a `Change` chip. Tapping anywhere expands the sheet in
 * place — the bar never navigates. With nothing selected (= unfiltered) all
 * five glyphs show dimmed so the bar keeps its shape (ambiguity #16).
 */
export function ContextBar({
  activeContexts,
  onExpand,
}: {
  activeContexts: TaskContext[];
  onExpand: () => void;
}) {
  const anySelected = activeContexts.length > 0;
  const shown = anySelected ? activeContexts : [...TASK_CONTEXTS];
  const summary = anySelected
    ? `contexts: ${activeContexts.map((c) => CONTEXT_LABELS[c]).join(', ')}`
    : 'all contexts';

  return (
    <Pressable
      accessibilityRole="button"
      aria-label={`Right now, ${summary}`}
      accessibilityHint="Tap to change what you have to hand"
      onPress={onExpand}
      className="h-[46px] flex-row items-center justify-between rounded-[15px] border border-outline-100 bg-background-0 py-0 pl-4 pr-[7px] active:bg-background-50"
    >
      <HStack className="flex-none items-center gap-1.5">
        <Text className="font-body-bold text-[13.5px] text-typography-900">Right now</Text>
        <BlockArrow direction="right" size={15} color={INK} />
      </HStack>
      <HStack className="min-w-0 flex-1 items-center justify-end gap-3 overflow-hidden pr-4">
        {shown.map((context) => (
          <Icon
            key={context}
            as={CONTEXT_ICONS[context]}
            size="sm"
            className={anySelected ? 'text-typography-500' : 'text-typography-300'}
          />
        ))}
      </HStack>
      <HStack className="h-8 flex-none items-center rounded-[10px] bg-primary-100 px-2.5">
        <Text className="font-body-bold text-xs text-primary-600">Change</Text>
      </HStack>
    </Pressable>
  );
}
