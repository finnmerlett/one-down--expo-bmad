import { forwardRef } from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

export type TextProps = RNTextProps;

export const Text = forwardRef<RNText, TextProps>((props, ref) => <RNText ref={ref} {...props} />);
Text.displayName = 'Text';
