import { Box } from '@/components/ui/box';
import { Icon, LoaderIcon, RepeatIcon } from '@/components/ui/icon';
import { useSyncStore } from '@/stores/sync-store';

// A whisper, not a nag (Story 5.3 AC-5): tiny muted glyph, no numbers, no
// red, no toast. Renders ONLY while sync is in flight or awaiting retry —
// idle/synced/signed-out shows nothing. Distinct job from 5.1's reachability
// dot: this reports sync work, that reports server reachability.
export function SyncIndicatorView({ status }: { status: 'syncing' | 'retrying' }) {
  return (
    <Box
      accessibilityLabel={status === 'syncing' ? 'Sync pending' : 'Sync retrying'}
      className="h-11 w-11 items-center justify-center"
    >
      <Icon
        as={status === 'syncing' ? LoaderIcon : RepeatIcon}
        size="sm"
        className="text-typography-400"
      />
    </Box>
  );
}

export function SyncIndicator() {
  const status = useSyncStore((state) => state.status);
  if (status === 'idle') return null;
  return <SyncIndicatorView status={status} />;
}
