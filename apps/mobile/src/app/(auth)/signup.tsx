import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { AuthScreen } from '@/components/auth/auth-screen';

// Data + behaviour for sign-up; everything visible is AuthScreen (signup mode).
export default function SignupRoute() {
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
    <AuthScreen
      mode="signup"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      errorMessage={error}
      onBack={() => router.back()}
      onSwitchMode={() => router.replace('/(auth)/login')}
    />
  );
}
