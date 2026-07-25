import { useState } from 'react';
import { KeyboardAvoidingView } from 'react-native';

import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

// Matches supabase/config.toml minimum_password_length.
const MIN_PASSWORD_LENGTH = 6;

/**
 * Presentational email/password form shared by login and signup (Story 5.2).
 * The routes own submission, error mapping, and navigation — every state here
 * is prop-driven so Storybook renders each one directly.
 */
export function AuthForm({
  mode,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  mode: 'login' | 'signup';
  onSubmit: (email: string, password: string) => void;
  isSubmitting: boolean;
  /** Inline error from the route (auth/network failures). */
  errorMessage: string | null;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Client-side guard failures render in the same inline slot.
  const [localError, setLocalError] = useState<string | null>(null);

  const submitLabel = mode === 'login' ? 'Sign in' : 'Create account';
  const shownError = localError ?? errorMessage;

  const handleSubmit = () => {
    if (!email.trim() || !password) {
      setLocalError('Enter your email and password first');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setLocalError(`Use at least ${MIN_PASSWORD_LENGTH} characters for the password`);
      return;
    }
    setLocalError(null);
    onSubmit(email.trim(), password);
  };

  return (
    // RN 0.85 Android is edge-to-edge: adjustResize never resizes, so
    // explicit padding behavior is required on BOTH platforms.
    <KeyboardAvoidingView behavior="padding" className="flex-1">
      <VStack className="gap-4 px-6 pt-4">
        <Input size="lg">
          <InputField
            aria-label="Email"
            placeholder="Email"
            value={email}
            onChangeText={(value: string) => {
              setEmail(value);
              if (localError) setLocalError(null);
            }}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
        </Input>
        <Input size="lg">
          <InputField
            aria-label="Password"
            placeholder="Password"
            value={password}
            onChangeText={(value: string) => {
              setPassword(value);
              if (localError) setLocalError(null);
            }}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </Input>
        {shownError ? (
          // Inline, near the fields, matter-of-fact — never a modal (AC-7/8).
          <Text className="font-body-medium text-sm text-error-600">{shownError}</Text>
        ) : null}
        <Button size="lg" onPress={handleSubmit} isDisabled={isSubmitting} aria-label={submitLabel}>
          {isSubmitting ? <ButtonSpinner /> : null}
          <ButtonText>{submitLabel}</ButtonText>
        </Button>
      </VStack>
    </KeyboardAvoidingView>
  );
}
