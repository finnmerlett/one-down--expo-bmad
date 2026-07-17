import { create } from 'zustand';

// Promise bridge between the fake entitlements provider and the fake billing
// sheet UI (Story 8.2b, local mode): the provider `open()`s and awaits; the
// sheet renders while `request` is non-null and `settle()`s the user's choice.
export type FakeBillingChoice = 'buy' | 'cancel' | 'fail';

interface FakeBillingState {
  request: { resolve: (choice: FakeBillingChoice) => void } | null;
  open: () => Promise<FakeBillingChoice>;
  settle: (choice: FakeBillingChoice) => void;
}

export const useFakeBillingStore = create<FakeBillingState>()((set, get) => ({
  request: null,
  open: () =>
    new Promise<FakeBillingChoice>((resolve) => {
      // Defensive: a second concurrent open cancels the first — only one
      // sheet can be on screen.
      get().request?.resolve('cancel');
      set({ request: { resolve } });
    }),
  settle: (choice) => {
    const { request } = get();
    if (!request) return;
    set({ request: null });
    request.resolve(choice);
  },
}));
