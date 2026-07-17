import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'retrying';

// UI state only (Story 5.3) — sync cursors live in SQLite (sync_meta), and
// task data is never mirrored into Zustand.
interface SyncState {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  beginSync: () => void;
  completeSync: () => void;
  failSync: () => void;
  resetSync: () => void;
}

export const useSyncStore = create<SyncState>()((set) => ({
  status: 'idle',
  lastSyncedAt: null,
  beginSync: () => set({ status: 'syncing' }),
  completeSync: () => set({ status: 'idle', lastSyncedAt: new Date() }),
  // Retry fires on the next trigger (connectivity/foreground/local change).
  failSync: () => set({ status: 'retrying' }),
  // Signed out: no sync, no indicator (AC-6).
  resetSync: () => set({ status: 'idle' }),
}));
