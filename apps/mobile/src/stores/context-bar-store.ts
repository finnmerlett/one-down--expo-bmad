import { create } from 'zustand';

// Session-only UI state (deliberately NOT persisted — spec ambiguity #15):
// the "Right now" sheet opens expanded the first time the home screen mounts
// each app launch, then stays collapsed for the session unless reopened.
interface ContextBarState {
  expanded: boolean;
  /** True once the per-session auto-open has been consumed. */
  autoOpened: boolean;
  expand: () => void;
  collapse: () => void;
  /** Called on home mount — expands only the first time per session. */
  autoOpenOnce: () => void;
  /** Forfeit the session's auto-open without expanding (empty deck at open). */
  consumeAutoOpen: () => void;
}

export const useContextBarStore = create<ContextBarState>()((set) => ({
  expanded: false,
  autoOpened: false,
  expand: () => set({ expanded: true }),
  collapse: () => set({ expanded: false }),
  autoOpenOnce: () =>
    set((state) => (state.autoOpened ? state : { expanded: true, autoOpened: true })),
  consumeAutoOpen: () => set((state) => (state.autoOpened ? state : { autoOpened: true })),
}));
