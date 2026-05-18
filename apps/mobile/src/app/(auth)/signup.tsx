import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAuth } from '@/hooks/use-auth';

export default function SignupScreen() {
  const { signUp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await signUp(email, password);
      if (authError) {
        setError(authError.message);
      }
    } catch {
      setError("Couldn't reach the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      if (authError.message.toLowerCase().includes('cancel')) {
        return;
      }
      setError(authError.message);
    }
  }

  return (
    <View className="flex-1 justify-center p-6">
      <VStack className="w-full max-w-[400px] self-center gap-4">
        <Text className="text-3xl font-bold text-center mb-2">Create Account</Text>

        {error ? (
          <Text testID="signup-error" className="text-red-600 text-sm text-center">
            {error}
          </Text>
        ) : null}

        <VStack className="gap-2">
          <Input
            testID="email-input"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            testID="password-input"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </VStack>

        <Button testID="signup-button" onPress={handleSignUp} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : null}
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>

        <Button testID="google-button" variant="secondary" onPress={handleGoogleSignIn}>
          Continue with Google
        </Button>

        <Link href="/(auth)/login" asChild>
          <Text testID="login-link" className="text-center text-blue-600 text-sm">
            Already have an account? Log in
          </Text>
        </Link>
      </VStack>
    </View>
  );
}
