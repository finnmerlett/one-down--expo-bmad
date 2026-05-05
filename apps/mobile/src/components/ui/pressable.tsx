import { forwardRef } from 'react';
import {
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
  type View,
} from 'react-native';

export type PressableProps = RNPressableProps;

export const Pressable = forwardRef<View, PressableProps>((props, ref) => (
  <RNPressable ref={ref} {...props} />
));
Pressable.displayName = 'Pressable';
