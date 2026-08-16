import { tva } from '@gluestack-ui/utils/nativewind-utils';

import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

/**
 * The app's standardised action buttons (Story 9.8, Keep A5). Three kinds:
 *
 * - `primary`          — THE terminal action of a screen: the full-height
 *                        54px filled pill (Mark as complete / Done editing /
 *                        Add N tasks are the reference design).
 * - `primary-compact`  — a filled primary action that isn't the screen's
 *                        terminal moment (quick-add Save, Show all tasks):
 *                        reduced height AND reduced text size.
 * - `secondary`        — link-style escape hatch (Add one task instead):
 *                        no fill, primary ink, compact text.
 *
 * Classes are static per instance (css-interop hazard: never swap className
 * per render) — disabled styling rides the `disabled:` modifier instead.
 */
const appButtonStyle = tva({
  base: 'flex-row items-center justify-center gap-[9px] rounded-full disabled:opacity-50',
  variants: {
    kind: {
      primary: 'h-[54px] bg-primary-500 px-6 shadow-fab active:bg-primary-600',
      'primary-compact': 'h-11 bg-primary-500 px-5 shadow-fab active:bg-primary-600',
      secondary: 'h-11 px-3 active:opacity-60',
    },
  },
});

const appButtonTextStyle = tva({
  base: 'font-body-bold',
  variants: {
    kind: {
      primary: 'text-base text-typography-0',
      'primary-compact': 'text-sm text-typography-0',
      secondary: 'text-sm text-primary-600',
    },
  },
});

export type AppButtonKind = 'primary' | 'primary-compact' | 'secondary';

export function AppButton({
  kind = 'primary',
  label,
  onPress,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: {
  kind?: AppButtonKind;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Merged onto the pill (layout tweaks like `mt-4` only). */
  className?: string;
  /** Defaults to the visible label. */
  'aria-label'?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      className={appButtonStyle({ kind, class: className })}
    >
      <Text className={appButtonTextStyle({ kind })}>{label}</Text>
    </Pressable>
  );
}
