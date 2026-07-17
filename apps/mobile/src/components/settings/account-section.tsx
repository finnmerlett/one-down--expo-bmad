import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/**
 * Account section of the settings screen (Story 5.2). Presentational — the
 * route owns navigation and sign-out, so both states are prop-driven.
 */
export function AccountSection({
  email,
  onSignIn,
  onCreateAccount,
  onSignOut,
}: {
  /** Signed-in email, or null when signed out. */
  email: string | null;
  onSignIn: () => void;
  onCreateAccount: () => void;
  onSignOut: () => void;
}) {
  return (
    <VStack className="gap-3">
      <Text className="text-lg font-semibold text-typography-900">Account</Text>
      {email ? (
        <VStack className="gap-3">
          <Text
            accessibilityLabel={`Signed in as ${email}`}
            className="text-sm text-typography-600"
          >
            Signed in as {email}
          </Text>
          <Button size="md" variant="outline" onPress={onSignOut} aria-label="Sign out">
            <ButtonText>Sign out</ButtonText>
          </Button>
        </VStack>
      ) : (
        <VStack className="gap-3">
          <Text className="text-sm text-typography-600">
            Sign in to sync your tasks across devices. Everything keeps working offline without an
            account.
          </Text>
          <Button size="md" onPress={onSignIn} aria-label="Sign in">
            <ButtonText>Sign in</ButtonText>
          </Button>
          <Button size="md" variant="outline" onPress={onCreateAccount} aria-label="Create account">
            <ButtonText>Create account</ButtonText>
          </Button>
        </VStack>
      )}
    </VStack>
  );
}
