import { create } from 'zustand';

// UI state only — task data lives in SQLite, never mirrored into Zustand.
interface QuickAddState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useQuickAddStore = create<QuickAddState>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
