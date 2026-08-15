import NetInfo from '@react-native-community/netinfo';
import { TRPCClientError } from '@trpc/client';
import { max } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { preferences, starActivityLog, subtasks, tasks } from '@one-down/shared/schema-local';

import { useAuth } from '@/components/auth/auth-provider';
import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { trpcClient } from '@/lib/trpc';
import { runSync, type SyncTransport } from '@/services/sync';
import { useSyncStore } from '@/stores/sync-store';

type SyncTrigger = 'local_change' | 'reconnect' | 'foreground' | 'sign_in';

// Debounce for the local-change trigger: batches a burst of edits into one
// round while staying well inside AC-1's 5-second budget.
const LOCAL_CHANGE_DEBOUNCE_MS = 1_500;

// Transport = the vanilla tRPC client (module-scoped, matches runSync's
// seam). The tasks pair keeps its legacy Story 5.3 wire shape
// ({ tasks: [...] } / { tasks, serverTime }) — deployed clients share it.
const transport: SyncTransport = {
  pushTasks: (rows) => trpcClient.sync.push.mutate({ tasks: rows }),
  pullTasks: async (since) => {
    const { tasks: rows, serverTime } = await trpcClient.sync.pull.query({ since });
    return { rows, serverTime };
  },
  pushSubtasks: (rows) => trpcClient.sync.pushSubtasks.mutate({ rows }),
  pullSubtasks: (since) => trpcClient.sync.pullSubtasks.query({ since }),
  pushStarActivity: (rows) => trpcClient.sync.pushStarActivity.mutate({ rows }),
  pullStarActivity: (since) => trpcClient.sync.pullStarActivity.query({ since }),
  pushPreferences: (rows) => trpcClient.sync.pushPreferences.mutate({ rows }),
  pullPreferences: (since) => trpcClient.sync.pullPreferences.query({ since }),
};

function failureReason(error: unknown): 'network' | 'server' | 'unknown' {
  if (error instanceof TRPCClientError) {
    // No structured data = the request never got a tRPC response (fetch
    // failure/timeout); with data it's a server-side rejection.
    return error.data == null ? 'network' : 'server';
  }
  return 'unknown';
}

/**
 * Sync trigger host (Story 5.3): local-change (debounced), connectivity
 * restoration, app foreground, and sign-in. Only runs with a session; runs
 * are serialized (in-flight guard) with at most one queued follow-up.
 */
export function useSync(): void {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const inFlightRef = useRef(false);
  const pendingRef = useRef<SyncTrigger | null>(null);

  // Stable dispatcher created once — reads the live session via ref.
  const [requestSync] = useState(() => {
    const run = async (trigger: SyncTrigger): Promise<void> => {
      const uid = userIdRef.current;
      if (!uid) return; // signed out: no sync attempts (AC-6)
      if (inFlightRef.current) {
        pendingRef.current = trigger; // serialize: queue one follow-up
        return;
      }
      inFlightRef.current = true;
      useSyncStore.getState().beginSync();
      const startedAt = Date.now();
      try {
        const outcome = await runSync(db, transport, { userId: uid });
        useSyncStore.getState().completeSync();
        track('sync_completed', {
          pushed: outcome.pushed,
          pulled: outcome.pulled,
          pushed_tasks: outcome.entities.tasks.pushed,
          pulled_tasks: outcome.entities.tasks.pulled,
          pushed_subtasks: outcome.entities.subtasks.pushed,
          pulled_subtasks: outcome.entities.subtasks.pulled,
          pushed_star_activity: outcome.entities.star_activity.pushed,
          pulled_star_activity: outcome.entities.star_activity.pulled,
          pushed_preferences: outcome.entities.preferences.pushed,
          pulled_preferences: outcome.entities.preferences.pulled,
          duration_ms: Date.now() - startedAt,
          trigger,
        });
      } catch (error) {
        useSyncStore.getState().failSync();
        track('sync_failed', { reason: failureReason(error), trigger });
      } finally {
        inFlightRef.current = false;
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending) void run(pending);
      }
    };
    return (trigger: SyncTrigger) => void run(trigger);
  });

  // (a) Local change: any content write bumps max(updatedAt) via $onUpdate.
  // One live query per synced entity (Story 9.7) — useLiveQuery only re-fires
  // on its primary table, so a step tick or star award must have its own
  // subscription to reach the server inside AC-1's budget.
  const { data: latestTaskRows } = useLiveQuery(
    db.select({ value: max(tasks.updatedAt) }).from(tasks),
  );
  const { data: latestSubtaskRows } = useLiveQuery(
    db.select({ value: max(subtasks.updatedAt) }).from(subtasks),
  );
  // The ledger is append-only — createdAt IS its content clock.
  const { data: latestStarRows } = useLiveQuery(
    db.select({ value: max(starActivityLog.createdAt) }).from(starActivityLog),
  );
  const { data: latestPrefRows } = useLiveQuery(
    db.select({ value: max(preferences.updatedAt) }).from(preferences),
  );
  const latestMs = Math.max(
    latestTaskRows?.[0]?.value?.getTime() ?? 0,
    latestSubtaskRows?.[0]?.value?.getTime() ?? 0,
    latestStarRows?.[0]?.value?.getTime() ?? 0,
    latestPrefRows?.[0]?.value?.getTime() ?? 0,
  );
  const lastSeenRef = useRef<number | null>(null);
  useEffect(() => {
    if (latestMs === 0 || lastSeenRef.current === latestMs) return;
    lastSeenRef.current = latestMs;
    const timer = setTimeout(() => requestSync('local_change'), LOCAL_CHANGE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [latestMs, requestSync]);

  // (b) Connectivity restoration (offline → online edge only).
  useEffect(() => {
    let wasConnected: boolean | null = null;
    return NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected === true;
      if (wasConnected === false && isConnected) requestSync('reconnect');
      wasConnected = isConnected;
    });
  }, [requestSync]);

  // (c) App returns to the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') requestSync('foreground');
    });
    return () => subscription.remove();
  }, [requestSync]);

  // (d) Session appears (sign-in, or a restored session at launch — this is
  // the initial sync). Signing out clears any pending/retrying indicator.
  useEffect(() => {
    if (userId) {
      requestSync('sign_in');
    } else {
      useSyncStore.getState().resetSync();
    }
  }, [userId, requestSync]);
}
