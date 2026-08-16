import { useState } from 'react';
import { Share } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/**
 * Debugging tools (Story 9.8, Keep F3): one button that snapshots the whole
 * local DB to the server and returns a uuid to quote in a bug report. The id
 * renders selectable (long-press to copy) with a Share fallback — a one-tap
 * clipboard needs expo-clipboard, a native module the current OTA runtime
 * doesn't carry. Presentational; the route supplies the capture.
 */
export function DebugSection({
  signedIn,
  onCapture,
}: {
  signedIn: boolean;
  /** Resolves to the snapshot's uuid once the upload lands. */
  onCapture: () => Promise<string>;
}) {
  const [busy, setBusy] = useState(false);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const capture = async () => {
    setBusy(true);
    setFailed(false);
    try {
      setSnapshotId(await onCapture());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <VStack className="gap-3 rounded-3xl border border-outline-100 bg-background-0 p-5">
      <VStack className="gap-1">
        <Text className="font-body-bold text-base text-typography-900">Debugging</Text>
        <Text className="font-body text-sm text-typography-500">
          Saves a snapshot of this device&apos;s data to your account and gives you an id to quote
          when reporting a problem.
        </Text>
      </VStack>
      <AppButton
        kind="primary-compact"
        aria-label="Get state snapshot"
        label={busy ? 'Saving...' : 'Get state snapshot'}
        disabled={busy || !signedIn}
        onPress={() => void capture()}
      />
      {!signedIn ? (
        <Text className="font-body text-sm text-typography-500">
          Sign in to save snapshots — they live on your account.
        </Text>
      ) : null}
      {failed ? (
        <Text accessibilityLiveRegion="polite" className="font-body text-sm text-error-600">
          Could not save the snapshot — check your connection and try again.
        </Text>
      ) : null}
      {snapshotId ? (
        <VStack className="gap-2">
          <Text
            selectable
            aria-label="Snapshot id"
            className="rounded-[10px] bg-background-100 px-3 py-2 font-mono text-sm text-typography-900"
          >
            {snapshotId}
          </Text>
          <AppButton
            kind="secondary"
            aria-label="Share snapshot id"
            label="Share id"
            onPress={() => void Share.share({ message: snapshotId })}
          />
        </VStack>
      ) : null}
    </VStack>
  );
}
