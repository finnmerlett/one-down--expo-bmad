import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { trpc } from '@/lib/trpc';

type Status = 'checking' | 'connected' | 'offline';

const STATUS_COPY: Record<Status, { label: string; a11yLabel: string; dotClass: string }> = {
  checking: {
    label: 'Checking…',
    a11yLabel: 'Checking server connection',
    dotClass: 'bg-neutral-300',
  },
  connected: {
    label: 'Connected',
    a11yLabel: 'Server connected',
    dotClass: 'bg-emerald-500',
  },
  offline: {
    label: 'Offline',
    a11yLabel: 'Server offline',
    dotClass: 'bg-neutral-400',
  },
};

export function ConnectionStatus() {
  const result = trpc.health.useQuery(undefined, { staleTime: 30_000 });

  let status: Status;
  if (result.isError) {
    status = 'offline';
  } else if (result.isSuccess && result.data.status === 'ok') {
    status = 'connected';
  } else {
    status = 'checking';
  }

  const copy = STATUS_COPY[status];

  return (
    <HStack
      accessibilityLabel={copy.a11yLabel}
      accessibilityLiveRegion="polite"
      className="items-center gap-2 px-3 py-1.5"
    >
      <Box className={`h-2 w-2 rounded-full ${copy.dotClass}`} />
      <Text className="text-xs text-neutral-500">{copy.label}</Text>
    </HStack>
  );
}
