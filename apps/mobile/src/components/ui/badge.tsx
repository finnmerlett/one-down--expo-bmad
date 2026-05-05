import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';

export type BadgeProps = ViewProps;

export const Badge = forwardRef<View, BadgeProps>(({ className, ...props }, ref) => (
  <View ref={ref} className={`rounded-full px-2 py-0.5 ${className ?? ''}`} {...props} />
));
Badge.displayName = 'Badge';
