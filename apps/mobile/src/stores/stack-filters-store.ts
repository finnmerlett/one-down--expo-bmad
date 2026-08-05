import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { TaskContext, TaskSize } from '@one-down/shared';

// UI state only — task data lives in SQLite, never mirrored into Zustand.
// Persisted: the stack filter selection survives app restarts.
// Rehydration is async — the first frame may render unfiltered/default.
// Accepted (<1s local filter NFR); never gate rendering on hydration.
interface StackFiltersState {
  /** Multi-select context filter — empty array = unfiltered stack. */
  activeContexts: TaskContext[];
  /** Story 3.2 mode — quick_win/big_time, or null when neither is active. */
  mode: TaskSize | null;
  toggleContext: (context: TaskContext) => void;
  toggleMode: (size: TaskSize) => void;
  /** v1.5 explicit tri-state setter (size switcher / HOW MUCH TIME segments). */
  setMode: (mode: TaskSize | null) => void;
  /** Single atomic reset — the empty-state "Show all tasks" CTA (Story 3.4). */
  clearFilters: () => void;
}

export const useStackFiltersStore = create<StackFiltersState>()(
  persist(
    (set) => ({
      activeContexts: [],
      mode: null,
      toggleContext: (context) =>
        set((state) => ({
          activeContexts: state.activeContexts.includes(context)
            ? state.activeContexts.filter((c) => c !== context)
            : [...state.activeContexts, context],
        })),
      // Re-press deactivates: quick wins / big time / neither (3-state).
      toggleMode: (size) => set((state) => ({ mode: state.mode === size ? null : size })),
      setMode: (mode) => set({ mode }),
      clearFilters: () => set({ activeContexts: [], mode: null }),
    }),
    { name: 'stack-filters', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
