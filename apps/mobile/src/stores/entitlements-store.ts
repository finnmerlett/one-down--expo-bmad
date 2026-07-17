import { create } from 'zustand';

// UI-visible entitlement state ONLY (quick-add-store pattern): deliberately
// dumb — no persistence, no provider calls. Story 8.2b's provider hydrates it
// on launch and after purchases; gated surfaces read it via useIsPremium().
interface EntitlementsState {
  isPremium: boolean;
  setPremium: (next: boolean) => void;
}

export const useEntitlementsStore = create<EntitlementsState>()((set) => ({
  isPremium: false,
  setPremium: (next) => set({ isPremium: next }),
}));
