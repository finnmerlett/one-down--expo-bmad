import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

export type TextareaProps = TextInputProps;

export const Textarea = forwardRef<TextInput, TextareaProps>((props, ref) => (
  <TextInput
    ref={ref}
    multiline
    numberOfLines={6}
    textAlignVertical="top"
    placeholderTextColor="#9ca3af"
    className="min-h-[120] w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900"
    {...props}
  />
));
Textarea.displayName = 'Textarea';
