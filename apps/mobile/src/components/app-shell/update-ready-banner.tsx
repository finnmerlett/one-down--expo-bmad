import { useEffect, useState } from 'react';

import { Updates } from '@/lib/expo-updates-safe';

import { HStack } from '@/components/ui/hstack';
import { CloseIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

import { track } from '@/lib/analytics/track';
import { useUpdateReady } from '@/hooks/use-update-ready';

/**
 * Presentational half (2026-07-27): a calm, dismissible one-liner that
 * appears when a downloaded OTA update is ready. One tap swaps the JS bundle
 * in place — no more "restart the app twice". Never a modal (design brief).
 */
export function UpdateReadyBannerView({
  restarting,
  onRestart,
  onDismiss,
}: {
  restarting?: boolean;
  onRestart: () => void;
  onDismiss: () => void;
}) {
  return (
    <HStack className="items-center gap-3 rounded-2xl border border-outline-100 bg-background-0 py-2 pl-4 pr-2">
      <Text numberOfLines={1} className="flex-1 font-body-medium text-sm text-typography-700">
        ✨ A fresh version is ready
      </Text>
      <Pressable
        accessibilityRole="button"
        aria-label="Restart to update"
        disabled={restarting}
        onPress={onRestart}
        className="h-9 items-center justify-center rounded-full bg-primary-600 px-4 active:bg-primary-700 disabled:opacity-60"
      >
        <Text className="font-body-bold text-sm text-typography-0">
          {restarting ? 'Restarting…' : 'Restart now'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        aria-label="Dismiss update banner"
        hitSlop={8}
        onPress={onDismiss}
        className="h-9 w-9 items-center justify-center rounded-full active:bg-background-100"
      >
        <Icon as={CloseIcon} size="sm" className="text-typography-400" />
      </Pressable>
    </HStack>
  );
}

/** Container half — shows once per ready update, session-dismissible. */
export function UpdateReadyBanner() {
  const ready = useUpdateReady();
  const [dismissed, setDismissed] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const visible = ready && !dismissed;

  useEffect(() => {
    if (visible) track('update_prompt_shown', { surface: 'home' });
  }, [visible]);

  if (!visible) return null;

  const handleRestart = () => {
    setRestarting(true);
    track('update_prompt_actioned', { action: 'restart' });
    // Stub binaries never report ready, so this only runs with a real engine.
    Updates.reloadAsync().catch((error: unknown) => {
      // A failed reload leaves the CURRENT version running — recoverable by
      // a normal restart, so just log and reset the button.
      // oxlint-disable-next-line no-console
      console.warn('Update reload failed', error);
      setRestarting(false);
    });
  };

  return (
    <UpdateReadyBannerView
      restarting={restarting}
      onRestart={handleRestart}
      onDismiss={() => {
        track('update_prompt_actioned', { action: 'dismiss' });
        setDismissed(true);
      }}
    />
  );
}
