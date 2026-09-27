import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { AuthScreen } from '@/components/auth/auth-screen';

// Data + behaviour for sign-in; everything visible is AuthScreen (login mode).
export default function LoginRoute() {
  const router = useRouter();
  const { signInWithEmail } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (email: string, password: string) => {
    setIsSubmitting(true);
    setError(null);
    void signInWithEmail(email, password).then((result) => {
      setIsSubmitting(false);
      // On success the (auth) layout redirects to settings automatically.
      if (result.error) setError(result.error);
    });
  };

  return (
    <AuthScreen
      mode="login"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      errorMessage={error}
      onBack={() => router.back()}
      onSwitchMode={() => router.replace('/(auth)/signup')}
    />
  );
}
