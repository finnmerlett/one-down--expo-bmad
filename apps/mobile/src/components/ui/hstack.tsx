import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';

export type HStackProps = ViewProps;

export const HStack = forwardRef<View, HStackProps>(({ className, ...props }, ref) => (
  <View ref={ref} className={`flex-row ${className ?? ''}`} {...props} />
));
HStack.displayName = 'HStack';
