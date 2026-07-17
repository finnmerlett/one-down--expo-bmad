import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { TaskContext } from '@one-down/shared';

// UI state only — task data lives in SQLite, never mirrored into Zustand.
// Persisted (AC5): the stack filter selection survives app restarts.
// Rehydration is async — the first frame may render unfiltered/default.
// Accepted (<1s local filter NFR); never gate rendering on hydration.
interface StackFiltersState {
  /** Multi-select context filter — empty array = unfiltered stack. */
  activeContexts: TaskContext[];
  toggleContext: (context: TaskContext) => void;
  // Extension points: Story 3.2 adds `mode: TaskSize | null` + toggleMode;
  // Story 3.4 adds clearFilters().
}

export const useStackFiltersStore = create<StackFiltersState>()(
  persist(
    (set) => ({
      activeContexts: [],
      toggleContext: (context) =>
        set((state) => ({
          activeContexts: state.activeContexts.includes(context)
            ? state.activeContexts.filter((c) => c !== context)
            : [...state.activeContexts, context],
        })),
    }),
    { name: 'stack-filters', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
