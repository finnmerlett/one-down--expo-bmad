import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

export type InputProps = TextInputProps;

export const Input = forwardRef<TextInput, InputProps>((props, ref) => (
  <TextInput
    ref={ref}
    placeholderTextColor="#9ca3af"
    className="min-h-[44] w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900"
    {...props}
  />
));
Input.displayName = 'Input';
