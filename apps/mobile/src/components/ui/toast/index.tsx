'use client';
import { AnimatePresence, Motion } from '@legendapp/motion';
import { createToastHook } from '@gluestack-ui/core/toast/creator';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { tva, useStyleContext, withStyleContext } from '@gluestack-ui/utils/nativewind-utils';
import React from 'react';
import { Text, View } from 'react-native';

// CLI note (Story 2.3): both the latest and the pinned 3.0.11 CLI emit the
// v4-alpha template (shadcn-style `bg-popover` tokens absent from our v3
// theme, a NativeWind-v3-only `styled()` helper, and a one-arg
// createToastHook call that doesn't match the installed @gluestack-ui/core).
// Rewritten by hand to the project's v3 token scale and the core's real
// two-arg hook signature (the hook animates the toast container itself with
// Motion props — no Reanimated entering needed on the root). The upstream
// ToastTitle `announceForAccessibility` hack was dropped — consumers own
// their announcement politeness (RewardToast uses a polite live region).
const useToast = createToastHook(Motion.View, AnimatePresence);
const SCOPE = 'TOAST';

const toastStyle = tva({
  base: 'm-1 gap-1 rounded-2xl p-4 web:pointer-events-auto',
  variants: {
    action: {
      error: 'bg-error-800',
      warning: 'bg-warning-700',
      success: 'bg-success-700',
      info: 'bg-info-700',
      muted: 'bg-background-900',
    },
    variant: {
      solid: 'shadow-toast',
      outline: 'border border-outline-100 bg-background-0 shadow-toast',
    },
  },
});

const toastTitleStyle = tva({
  base: 'text-left font-body-semibold tracking-normal',
  variants: {
    isTruncated: {
      true: '',
    },
    bold: {
      true: 'font-body-bold',
    },
    underline: {
      true: 'underline',
    },
    strikeThrough: {
      true: 'line-through',
    },
    size: {
      '2xs': 'text-2xs',
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
      '5xl': 'text-5xl',
      '6xl': 'text-6xl',
    },
  },
  parentVariants: {
    variant: {
      solid: 'text-typography-0',
      outline: 'text-typography-900',
    },
  },
});

const toastDescriptionStyle = tva({
  base: 'text-left font-body tracking-normal',
  variants: {
    isTruncated: {
      true: '',
    },
    bold: {
      true: 'font-body-bold',
    },
    underline: {
      true: 'underline',
    },
    strikeThrough: {
      true: 'line-through',
    },
    size: {
      '2xs': 'text-2xs',
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
      '5xl': 'text-5xl',
      '6xl': 'text-6xl',
    },
  },
  parentVariants: {
    variant: {
      solid: 'text-typography-50',
      outline: 'text-typography-700',
    },
  },
});

const Root = withStyleContext(View, SCOPE);
type IToastProps = React.ComponentProps<typeof Root> & {
  className?: string;
} & VariantProps<typeof toastStyle>;

const Toast = React.forwardRef<React.ComponentRef<typeof Root>, IToastProps>(function Toast(
  { className, variant = 'solid', action = 'muted', ...props },
  ref,
) {
  return (
    <Root
      ref={ref}
      className={toastStyle({ variant, action, class: className })}
      context={{ variant, action }}
      {...props}
    />
  );
});

type IToastTitleProps = React.ComponentProps<typeof Text> & {
  className?: string;
} & VariantProps<typeof toastTitleStyle>;

const ToastTitle = React.forwardRef<React.ComponentRef<typeof Text>, IToastTitleProps>(
  function ToastTitle({ className, size = 'md', children, ...props }, ref) {
    const { variant: parentVariant } = useStyleContext(SCOPE);
    return (
      <Text
        {...props}
        ref={ref}
        className={toastTitleStyle({
          size,
          class: className,
          parentVariants: {
            variant: parentVariant,
          },
        })}
      >
        {children}
      </Text>
    );
  },
);

type IToastDescriptionProps = React.ComponentProps<typeof Text> & {
  className?: string;
} & VariantProps<typeof toastDescriptionStyle>;

const ToastDescription = React.forwardRef<React.ComponentRef<typeof Text>, IToastDescriptionProps>(
  function ToastDescription({ className, size = 'md', ...props }, ref) {
    const { variant: parentVariant } = useStyleContext(SCOPE);
    return (
      <Text
        ref={ref}
        {...props}
        className={toastDescriptionStyle({
          size,
          class: className,
          parentVariants: {
            variant: parentVariant,
          },
        })}
      />
    );
  },
);

Toast.displayName = 'Toast';
ToastTitle.displayName = 'ToastTitle';
ToastDescription.displayName = 'ToastDescription';

export { Toast, ToastDescription, ToastTitle, useToast };
