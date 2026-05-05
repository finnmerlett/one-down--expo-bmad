import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, type TextInput } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';

export type QuickAddSubmitInput = {
  title: string;
  details: string | null;
};

export type QuickAddSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: QuickAddSubmitInput) => Promise<void> | void;
};

export function QuickAddSheet({ isOpen, onClose, onSubmit }: QuickAddSheetProps) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef<TextInput | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      setError('Title is required');
      return;
    }
    const trimmedDetails = details.trim().length > 0 ? details.trim() : null;

    setSubmitting(true);
    try {
      await onSubmit({ title: trimmedTitle, details: trimmedDetails });
      setTitle('');
      setDetails('');
      setError(null);
      titleRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }, [title, details, onSubmit]);

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <Pressable onPress={handleClose} accessible={false} className="flex-1 bg-black/40">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Pressable onPress={() => {}} accessible={false} className="rounded-t-2xl bg-white p-4">
            <Text className="mb-3 text-lg font-semibold text-neutral-900">Add a task</Text>
            <Input
              ref={titleRef}
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (error) setError(null);
              }}
              placeholder="What do you need to do?"
              autoFocus
              accessibilityLabel="Task title"
              returnKeyType="next"
            />
            {error ? (
              <Text accessibilityLiveRegion="polite" className="mt-1 text-sm text-red-600">
                {error}
              </Text>
            ) : null}
            <Box className="h-3" />
            <Textarea
              value={details}
              onChangeText={setDetails}
              placeholder="Details (optional)"
              accessibilityLabel="Task details (optional)"
            />
            <Box className="mt-4 flex-row justify-end">
              <Button variant="secondary" onPress={handleClose} accessibilityLabel="Close add task">
                Close
              </Button>
              <Box className="w-3" />
              <Button onPress={handleSubmit} disabled={submitting} accessibilityLabel="Save task">
                Save
              </Button>
            </Box>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
