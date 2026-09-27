import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { AuthForm } from '@/components/auth/auth-form';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

export type AuthMode = 'login' | 'signup';

// Per-mode copy: the header title and the link to the other auth screen.
const COPY: Record<AuthMode, { title: string; switchLabel: string }> = {
  login: { title: 'Sign in', switchLabel: 'No account? Create one' },
  signup: { title: 'Create account', switchLabel: 'Already have an account? Sign in' },
};

/**
 * The whole sign-in / create-account screen as the user sees it — back
 * header, the email/password form and the link to the other auth screen —
 * driven entirely by props. src/app/(auth)/login.tsx and signup.tsx supply
 * the auth calls and navigation (the (auth) layout adds no chrome of its
 * own); the screen stories (and so the design canvas) supply fixtures.
 */
export function AuthScreen({
  mode,
  onSubmit,
  isSubmitting,
  errorMessage,
  onBack,
  onSwitchMode,
}: {
  mode: AuthMode;
  onSubmit: (email: string, password: string) => void;
  isSubmitting: boolean;
  /** Inline error from the route (auth/network failures). */
  errorMessage: string | null;
  onBack: () => void;
  /** The "No account? / Already have an account?" link. */
  onSwitchMode: () => void;
}) {
  const { title, switchLabel } = COPY[mode];
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <HStack className="items-center gap-1 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Back to settings"
          hitSlop={8}
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
        <Text className="font-heading text-2xl text-typography-900">{title}</Text>
      </HStack>
      <AuthForm
        mode={mode}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
      />
      <Pressable
        accessibilityRole="button"
        aria-label={switchLabel}
        hitSlop={8}
        onPress={onSwitchMode}
        className="min-h-11 items-center justify-center px-6"
      >
        <Text className="font-body-bold text-primary-600">{switchLabel}</Text>
      </Pressable>
    </SafeAreaView>
  );
}
