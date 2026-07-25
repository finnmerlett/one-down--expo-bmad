import { Globe, House, Laptop, MapPin, Smartphone, type LucideIcon } from 'lucide-react-native';
import { TASK_CONTEXTS, type TaskContext } from '@one-down/shared';

import { CONTEXT_LABELS } from '@/components/card-stack/task-card';
import { Box } from '@/components/ui/box';
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

function ContextButton({
  context,
  active,
  available,
  urgent,
  onToggle,
}: {
  context: TaskContext;
  active: boolean;
  available: boolean;
  urgent: boolean;
  onToggle: (context: TaskContext) => void;
}) {
  // UX rule (AC4): an empty context stays enabled while ON so the user can
  // see/leave the empty result, but cannot be re-selected once switched OFF.
  const disabled = !available && !active;
  const iconColor = active
    ? 'text-typography-900'
    : disabled
      ? 'text-typography-300'
      : 'text-typography-400';

  return (
    <Pressable
      accessibilityRole="button"
      // "Filter context:" — deliberately distinct from the card back's
      // "Context:" toggles so Maestro full-string selectors never collide.
      accessibilityLabel={`Filter context: ${CONTEXT_LABELS[context]}${urgent ? ', has urgent tasks' : ''}`}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onToggle(context)}
      // Even, tappable chip row: selected = filled warm pill with ink icon,
      // unselected = faint white pill, unavailable = ghosted.
      className={`h-11 flex-1 items-center justify-center rounded-full active:bg-primary-50 ${
        active
          ? 'bg-primary-100'
          : disabled
            ? 'bg-background-0/40'
            : 'border border-outline-100 bg-background-0'
      }`}
    >
      <Icon as={CONTEXT_ICONS[context]} size="lg" className={iconColor} />
      {/* Urgent indicator (FR15): single subtle dot, warning tint (calm, not
          red), no count — "the app does the worrying". */}
      {urgent ? (
        <Box className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-warning-400" />
      ) : null}
    </Pressable>
  );
}

const NO_URGENT: ReadonlySet<TaskContext> = new Set();

/**
 * Icon-only context filter bar (Story 3.1). Presentational — no store access,
 * the home screen owns filter state. Labels live in a11y only; calm styling,
 * no badges/counts (ADHD principle: no overwhelm).
 */
export function ContextToggleBar({
  activeContexts,
  availableContexts,
  urgentContexts = NO_URGENT,
  onToggle,
}: {
  activeContexts: TaskContext[];
  availableContexts: ReadonlySet<TaskContext>;
  /** Story 3.3 — contexts with urgent (≤48h/overdue) tasks get an indicator
   *  dot, but only while a context filter is active AND the button is not
   *  itself active (the unfiltered stack already surfaces urgent tasks). */
  urgentContexts?: ReadonlySet<TaskContext>;
  onToggle: (context: TaskContext) => void;
}) {
  const anyActive = activeContexts.length > 0;
  return (
    <HStack className="items-center gap-2 px-4 py-1">
      {TASK_CONTEXTS.map((context) => {
        const active = activeContexts.includes(context);
        return (
          <ContextButton
            key={context}
            context={context}
            active={active}
            available={availableContexts.has(context)}
            urgent={anyActive && !active && urgentContexts.has(context)}
            onToggle={onToggle}
          />
        );
      })}
    </HStack>
  );
}
