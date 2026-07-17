import { Globe, House, Laptop, MapPin, Smartphone, type LucideIcon } from 'lucide-react-native';
import { TASK_CONTEXTS, type TaskContext } from '@one-down/shared';

import { CONTEXT_LABELS } from '@/components/card-stack/task-card';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

const CONTEXT_ICONS: Record<TaskContext, LucideIcon> = {
  home: House,
  out_and_about: MapPin,
  phone: Smartphone,
  laptop: Laptop,
  internet: Globe,
};

// Kept as its own sub-component: Story 3.3 slots an urgent-indicator dot in
// here without touching the bar layout.
function ContextButton({
  context,
  active,
  available,
  onToggle,
}: {
  context: TaskContext;
  active: boolean;
  available: boolean;
  onToggle: (context: TaskContext) => void;
}) {
  // UX rule (AC4): an empty context stays enabled while ON so the user can
  // see/leave the empty result, but cannot be re-selected once switched OFF.
  const disabled = !available && !active;
  const iconColor = active
    ? 'text-primary-700'
    : disabled
      ? 'text-typography-300'
      : 'text-typography-500';

  return (
    <Pressable
      accessibilityRole="button"
      // "Filter context:" — deliberately distinct from the card back's
      // "Context:" toggles so Maestro full-string selectors never collide.
      accessibilityLabel={`Filter context: ${CONTEXT_LABELS[context]}`}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onToggle(context)}
      className={`h-11 w-11 items-center justify-center rounded-full active:bg-background-100 ${
        active ? 'bg-primary-100' : ''
      }`}
    >
      <Icon as={CONTEXT_ICONS[context]} size="xl" className={iconColor} />
    </Pressable>
  );
}

/**
 * Icon-only context filter bar (Story 3.1). Presentational — no store access,
 * the home screen owns filter state. Labels live in a11y only; calm styling,
 * no badges/counts (ADHD principle: no overwhelm).
 */
export function ContextToggleBar({
  activeContexts,
  availableContexts,
  onToggle,
}: {
  activeContexts: TaskContext[];
  availableContexts: ReadonlySet<TaskContext>;
  onToggle: (context: TaskContext) => void;
}) {
  return (
    <HStack className="items-center justify-between px-4 py-1">
      {TASK_CONTEXTS.map((context) => (
        <ContextButton
          key={context}
          context={context}
          active={activeContexts.includes(context)}
          available={availableContexts.has(context)}
          onToggle={onToggle}
        />
      ))}
    </HStack>
  );
}
