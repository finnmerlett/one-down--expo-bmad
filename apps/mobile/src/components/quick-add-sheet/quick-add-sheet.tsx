import { useEffect, useRef, useState } from 'react';
import { Keyboard, Modal, Pressable, View, type TextInput } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';

import type { CreateTaskInput } from '@/services/tasks-repository';

// Slide-up sheet over the home screen. Stays open after a successful save and
// refocuses the title input so several tasks can be captured in a row.
export function QuickAddSheet({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<TextInput>(null);

  // Manual keyboard inset. KeyboardAvoidingView inside a Modal held a stale
  // bottom pad when the keyboard was dismissed with BACK while the input
  // stayed focused — the sheet hovered a keyboard-height above the bottom
  // (bug session 2026-08-11 item 10). The global keyboardDidShow/Hide pair
  // fires reliably for both dismissal paths, so the pad always resets.
  const [keyboardPad, setKeyboardPad] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardPad(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardPad(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Drafts deliberately survive close/reopen (don't punish an interrupted
  // capture) — but a stale validation error must not greet a fresh open.
  useEffect(() => {
    setError(null);
  }, [isOpen]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Give your task a title first');
      return;
    }
    try {
      await onSubmit({ title, details });
      setTitle('');
      setDetails('');
      setError(null);
      titleRef.current?.focus();
    } catch {
      setError('Could not save your task — please try again');
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      {/* RN 0.85 Android is edge-to-edge: adjustResize never resizes the Modal
          window, so an explicit keyboard pad is required on BOTH platforms. */}
      <View className="flex-1" style={{ paddingBottom: keyboardPad }}>
        {/* Backdrop: tap anywhere above the sheet to dismiss */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close add task"
          onPress={onClose}
          className="flex-1"
        />
        <VStack className="gap-4 rounded-t-[28px] bg-background-0 p-6 pb-10 shadow-soft-card">
          {/* Grabber bar: sheets read as sheets (design brief). */}
          <VStack className="items-center">
            <VStack className="h-1.5 w-10 rounded-full bg-background-400" />
          </VStack>
          <Text className="font-heading text-xl text-typography-900">Add a task</Text>
          <Input size="lg">
            <InputField
              ref={titleRef}
              aria-label="Task title"
              placeholder="What needs doing?"
              value={title}
              onChangeText={(value: string) => {
                setTitle(value);
                if (error) setError(null);
              }}
              autoFocus
            />
          </Input>
          <Textarea size="md">
            <TextareaInput
              aria-label="Task details"
              placeholder="Details (optional)"
              value={details}
              onChangeText={setDetails}
            />
          </Textarea>
          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              className="font-body-medium text-sm text-error-600"
            >
              {error}
            </Text>
          ) : null}
          <Button size="lg" aria-label="Save task" onPress={handleSave}>
            <ButtonText>Save</ButtonText>
          </Button>
        </VStack>
      </View>
    </Modal>
  );
}
