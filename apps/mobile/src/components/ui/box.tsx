import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';

export type BoxProps = ViewProps;

export const Box = forwardRef<View, BoxProps>((props, ref) => <View ref={ref} {...props} />);
Box.displayName = 'Box';
