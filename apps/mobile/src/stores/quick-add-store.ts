import { create } from 'zustand';

export type QuickAddState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const useQuickAddStore = create<QuickAddState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
