import { TASK_CONTEXTS, type TaskContext, type TaskSize } from '@one-down/shared';

import { CONTEXT_LABELS } from '@/components/card-stack/task-card';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { BlockArrow } from './block-arrow';
import { CONTEXT_ICONS } from './context-icons';

const INK = '#2C2723';

const TIME_OPTIONS: { value: TaskSize | null; label: string }[] = [
  { value: 'quick_win', label: 'Quick wins' },
  { value: 'big_time', label: 'Big time' },
  { value: null, label: 'Either' },
];

function ContextTile({
  context,
  active,
  available,
  attention,
  onToggle,
}: {
  context: TaskContext;
  active: boolean;
  available: boolean;
  /** E7: this UNSELECTED context hides a live bonus or an overdue card. */
  attention: boolean;
  onToggle: (context: TaskContext) => void;
}) {
  // UX rule (AC4, carried from 3.1): an empty context stays enabled while ON
  // so the user can see/leave the empty result, but can't be re-selected off.
  const disabled = !available && !active;
  return (
    <Pressable
      accessibilityRole="button"
      // "Filter context:" — deliberately distinct from the card back's
      // "Context:" toggles so Maestro full-string selectors never collide.
      accessibilityLabel={`Filter context: ${CONTEXT_LABELS[context]}`}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={() => onToggle(context)}
      className={`h-[58px] w-[48%] flex-row items-center gap-2.5 rounded-[15px] px-3.5 ${
        active
          ? 'border-[1.5px] border-primary-300 bg-primary-50'
          : disabled
            ? 'border border-outline-100 bg-background-0 opacity-40'
            : 'border border-outline-100 bg-background-0'
      }`}
    >
      <Icon
        as={CONTEXT_ICONS[context]}
        size="md"
        className={active ? 'text-primary-600' : 'text-typography-500'}
      />
      <Text
        className={
          active
            ? 'font-body-bold text-sm text-primary-600'
            : 'font-body-medium text-sm text-typography-700'
        }
      >
        {CONTEXT_LABELS[context]}
      </Text>
      {attention && !active ? (
        <Box className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background-0 bg-primary-500" />
      ) : null}
    </Pressable>
  );
}

/**
 * Expanded "Right now" sheet (v1.5 frame 01): floats over the scrimmed deck,
 * never leaves the screen. Contexts as a 2-col grid, HOW MUCH TIME segmented
 * (Quick wins / Big time / Either — same tri-state as the size switcher's
 * All), `Done` collapses. Opens automatically once per app session.
 */
export function ContextSheet({
  activeContexts,
  availableContexts,
  attentionContexts,
  mode,
  onToggleContext,
  onSetMode,
  onDone,
}: {
  activeContexts: TaskContext[];
  availableContexts: ReadonlySet<TaskContext>;
  /** E7 dots: contexts hiding a live bonus or an overdue card. */
  attentionContexts?: ReadonlySet<TaskContext>;
  mode: TaskSize | null;
  onToggleContext: (context: TaskContext) => void;
  onSetMode: (mode: TaskSize | null) => void;
  onDone: () => void;
}) {
  return (
    <VStack className="rounded-[22px] border border-outline-100 bg-background-0 px-4 pb-[18px] pt-[15px] shadow-sheet">
      <HStack className="items-center justify-between gap-2.5">
        <VStack className="min-w-0 gap-0.5">
          <HStack className="items-center gap-1.5">
            <Text className="font-body-bold text-[15px] text-typography-900">Right now</Text>
            <BlockArrow direction="down" size={15} color={INK} />
          </HStack>
          <Text className="font-body-medium text-xs text-typography-500">
            What have you got to hand?
          </Text>
        </VStack>
        <Pressable
          accessibilityRole="button"
          aria-label="Done choosing contexts"
          hitSlop={8}
          onPress={onDone}
          className="h-[34px] flex-none items-center justify-center rounded-[11px] bg-primary-500 px-4 active:bg-primary-600"
        >
          <Text className="font-body-bold text-[12.5px] text-typography-0">Done</Text>
        </Pressable>
      </HStack>

      <Box className="my-[15px] h-px bg-outline-50" />

      <Box className="flex-row flex-wrap justify-between gap-2">
        {TASK_CONTEXTS.map((context) => (
          <ContextTile
            key={context}
            context={context}
            active={activeContexts.includes(context)}
            available={availableContexts.has(context)}
            attention={attentionContexts?.has(context) ?? false}
            onToggle={onToggleContext}
          />
        ))}
      </Box>

      <VStack className="mt-[15px] gap-2.5">
        <Text className="font-mono text-[11px] uppercase tracking-caps text-typography-400">
          How much time
        </Text>
        <HStack className="rounded-full bg-[rgba(44,39,35,0.06)] p-[3px]">
          {TIME_OPTIONS.map(({ value, label }) => {
            const selected = mode === value;
            return (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={`Mode: ${label}`}
                accessibilityState={{ selected }}
                onPress={() => onSetMode(value)}
                className={`h-[38px] flex-1 items-center justify-center rounded-full ${
                  selected ? 'bg-background-0 shadow-segment' : 'active:bg-background-300/50'
                }`}
              >
                <Text
                  className={
                    selected
                      ? 'font-body-bold text-[13px] text-primary-500'
                      : 'font-body-medium text-[13px] text-typography-500'
                  }
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </HStack>
      </VStack>
    </VStack>
  );
}
