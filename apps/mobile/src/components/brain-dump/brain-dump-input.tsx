import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { MAX_BRAIN_DUMP_CHARS } from '@one-down/shared';

import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';

/**
 * Brain dump lifecycle (Story 6.1). `submitted` is the quiet first second of
 * a parse — input already disabled, but no spinner yet (UX-DR20: the loading
 * treatment fades in after a 1s delay so fast responses never flash it). The
 * 1s/4s timers live in the ROUTE; this component is a pure state renderer.
 */
export type BrainDumpState = 'idle' | 'submitted' | 'parsing' | 'parsing_long' | 'error';

/**
 * Brain dump capture surface (FR1/FR2): one large textarea, one primary
 * action. "Add one task instead" keeps quick add reachable (UX-DR15); the
 * offline error keeps retry visible and offers quick add as the fallback —
 * inline text only, never a modal.
 */
export function BrainDumpInput({
  state,
  onSubmit,
  onQuickAddInstead,
}: {
  state: BrainDumpState;
  onSubmit: (text: string) => void;
  onQuickAddInstead: () => void;
}) {
  const [text, setText] = useState('');
  const pending = state === 'submitted' || state === 'parsing' || state === 'parsing_long';

  return (
    // Edge-to-edge Android never resizes for the keyboard — explicit padding
    // keeps the submit row reachable while dumping (same as the card back).
    <KeyboardAvoidingView behavior="padding" className="flex-1">
      <VStack className="flex-1 gap-4 px-6 pb-6 pt-2">
        <Text className="text-2xl font-semibold text-typography-900">Brain dump</Text>
        <Text className="text-base text-typography-600">
          Get it all out — we&apos;ll sort it into tasks.
        </Text>
        {/* Stays visible while parsing, just disabled (UX-DR20). */}
        <Textarea size="lg" isDisabled={pending} className="min-h-40 flex-1">
          <TextareaInput
            aria-label="Brain dump"
            placeholder="What's on your mind?"
            value={text}
            onChangeText={setText}
            maxLength={MAX_BRAIN_DUMP_CHARS}
            className="flex-1"
          />
        </Textarea>
        {state === 'error' ? (
          <Text accessibilityLiveRegion="polite" className="text-sm text-error-600">
            Brain dump needs an internet connection. You can still add tasks one at a time.
          </Text>
        ) : null}
        {pending ? (
          // The spinner replaces the submit button (UX-DR20). It only renders
          // once the route escalates past `submitted`, fading in so a fast
          // parse never flashes a loading state.
          state === 'submitted' ? null : (
            <Animated.View entering={FadeIn}>
              <HStack className="items-center justify-center gap-3 py-3">
                <ActivityIndicator accessibilityLabel="Parsing" />
                <VStack>
                  <Text className="text-base text-typography-700">Parsing your tasks...</Text>
                  {state === 'parsing_long' ? (
                    <Text className="text-sm text-typography-500">Taking a bit longer...</Text>
                  ) : null}
                </VStack>
              </HStack>
            </Animated.View>
          )
        ) : (
          <Button
            size="xl"
            aria-label="Parse my tasks"
            isDisabled={text.trim().length === 0}
            onPress={() => onSubmit(text)}
          >
            <ButtonText>Parse my tasks</ButtonText>
          </Button>
        )}
        {state === 'error' ? (
          <Button
            size="lg"
            variant="outline"
            aria-label="Use quick add instead"
            onPress={onQuickAddInstead}
          >
            <ButtonText>Use quick add instead</ButtonText>
          </Button>
        ) : null}
        {/* Visually secondary (link-style) — one primary action per screen. */}
        <Button
          size="lg"
          variant="link"
          isDisabled={pending}
          aria-label="Add one task instead"
          onPress={onQuickAddInstead}
        >
          <ButtonText>Add one task instead</ButtonText>
        </Button>
      </VStack>
    </KeyboardAvoidingView>
  );
}
