import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';

export type VStackProps = ViewProps;

export const VStack = forwardRef<View, VStackProps>(({ className, ...props }, ref) => (
  <View ref={ref} className={`flex-col ${className ?? ''}`} {...props} />
));
VStack.displayName = 'VStack';
