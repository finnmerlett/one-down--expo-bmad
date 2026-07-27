import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { trpc } from '@/lib/trpc';

export type ConnectionState = 'checking' | 'connected' | 'offline';

const DOT_CLASSES: Record<ConnectionState, string> = {
  checking: 'bg-background-400',
  connected: 'bg-success-500',
  offline: 'bg-warning-400',
};

// Presentational half — deliberately subtle (ADHD-first calm home screen):
// a small dot, plus the UX-spec offline line. Never red, never a modal.
export function ConnectionStatusView({ status }: { status: ConnectionState }) {
  return (
    <HStack
      // RN has no 'status' role — the label + polite live region carry it.
      // `accessible` is required: a plain View is not important-for-a11y on
      // Android, so without it the label never enters the accessibility tree
      // (invisible to TalkBack AND Maestro).
      accessible
      accessibilityLabel={`Server connection: ${status}`}
      accessibilityLiveRegion="polite"
      className="items-center gap-1.5"
    >
      {status === 'offline' ? (
        <Text className="text-xs text-typography-500">
          Couldn't reach the server — working offline
        </Text>
      ) : null}
      <Box className={`h-2 w-2 rounded-full ${DOT_CLASSES[status]}`} />
    </HStack>
  );
}

// Container half — needs a live TrpcProvider above it.
export function ConnectionStatus() {
  // Poll rather than probe-once (2026-07-27): RN never fires the window
  // focus/reconnect events TanStack relies on, so a single failed mount-time
  // check (WiFi still waking, momentary cellular) wedged the offline banner
  // for the whole session. Retry quickly while offline, lazily once green.
  const health = trpc.health.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchInterval: (query) => (query.state.status === 'error' ? 15_000 : 60_000),
  });
  const status: ConnectionState = health.isPending
    ? 'checking'
    : health.isError
      ? 'offline'
      : 'connected';
  return <ConnectionStatusView status={status} />;
}
