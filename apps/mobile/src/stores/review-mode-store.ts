import { create } from 'zustand';

// UI state only (Story 6.2) — which tasks NEED review is derived from the
// live query (`hasCheckNeeded`), never mirrored here.
interface ReviewModeState {
  isReviewing: boolean;
  enter: () => void;
  exit: () => void;
}

export const useReviewModeStore = create<ReviewModeState>()((set) => ({
  isReviewing: false,
  enter: () => set({ isReviewing: true }),
  exit: () => set({ isReviewing: false }),
}));
