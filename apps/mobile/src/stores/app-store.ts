import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// App-level session/absence state (Story 7.3). UI state only — task data
// lives in SQLite, never mirrored into Zustand (stack-filters-store pattern).
//
// `lastActiveAt` is PERSISTED (absence must be measured across launches);
// `welcomeBackPending` is a session flag driving the one-shot quick-win
// promotion and is deliberately partialized OUT of storage.
interface AppState {
  /** Epoch ms of the last time the app was active; null = first launch. */
  lastActiveAt: number | null;
  /** Set when the welcome-back screen shows; cleared after the promoted deck renders. */
  welcomeBackPending: boolean;
  setLastActiveAt: (at: number) => void;
  setWelcomeBackPending: (pending: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      lastActiveAt: null,
      welcomeBackPending: false,
      setLastActiveAt: (at) => set({ lastActiveAt: at }),
      setWelcomeBackPending: (pending) => set({ welcomeBackPending: pending }),
    }),
    {
      name: 'app-state',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ lastActiveAt: state.lastActiveAt }),
    },
  ),
);
