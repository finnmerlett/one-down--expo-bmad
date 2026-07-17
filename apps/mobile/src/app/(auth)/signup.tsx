import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { AuthForm } from '@/components/auth/auth-form';
import { useAuth } from '@/components/auth/auth-provider';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

export default function SignupScreen() {
  const router = useRouter();
  const { signUpWithEmail } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (email: string, password: string) => {
    setIsSubmitting(true);
    setError(null);
    void signUpWithEmail(email, password).then((result) => {
      setIsSubmitting(false);
      // Local GoTrue signs the new user in immediately (confirmations off) —
      // the (auth) layout redirect takes over on success.
      if (result.error) setError(result.error);
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-0">
      <HStack className="items-center gap-1 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Back to settings"
          hitSlop={8}
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
        <Text className="text-xl font-semibold text-typography-900">Create account</Text>
      </HStack>
      <AuthForm
        mode="signup"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        errorMessage={error}
      />
      <Pressable
        accessibilityRole="button"
        aria-label="Already have an account? Sign in"
        hitSlop={8}
        onPress={() => router.replace('/(auth)/login')}
        className="min-h-11 items-center justify-center px-6"
      >
        <Text className="font-medium text-primary-600">Already have an account? Sign in</Text>
      </Pressable>
    </SafeAreaView>
  );
}
