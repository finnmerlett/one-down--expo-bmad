import type { ReactNode } from 'react';
import { forwardRef } from 'react';
import { Pressable, type PressableProps, type View } from 'react-native';

import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, { container: string; label: string }> = {
  primary: {
    container: 'bg-blue-600 active:bg-blue-700',
    label: 'text-white',
  },
  secondary: {
    container: 'bg-neutral-200 active:bg-neutral-300',
    label: 'text-neutral-900',
  },
};

export const Button = forwardRef<View, ButtonProps>(
  ({ children, variant = 'primary', disabled, accessibilityState, ...rest }, ref) => {
    const v = variantClasses[variant];
    const containerClass = `${v.container} min-h-[44] items-center justify-center rounded-md px-4 py-2 ${
      disabled ? 'opacity-50' : ''
    }`;
    const labelClass = `${v.label} text-base font-medium`;
    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
        disabled={disabled}
        className={containerClass}
        {...rest}
      >
        {typeof children === 'string' ? <Text className={labelClass}>{children}</Text> : children}
      </Pressable>
    );
  },
);
Button.displayName = 'Button';
