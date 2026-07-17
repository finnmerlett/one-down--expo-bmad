import AsyncStorage from '@react-native-async-storage/async-storage';

import { useFakeBillingStore } from '@/stores/fake-billing-store';

import type { EntitlementsProvider, EntitlementState, PurchaseResult } from './types';

// Local fake provider (Story 8.2b, decisions-log 2026-07-16): no RevenueCat
// account, no react-native-purchases. Entitlement cache ≠ user data — plain
// AsyncStorage, no sqlite migration.
export const FAKE_ENTITLEMENTS_STORAGE_KEY = 'onedown.entitlements.fake';

async function readStoredState(): Promise<EntitlementState> {
  try {
    const raw = await AsyncStorage.getItem(FAKE_ENTITLEMENTS_STORAGE_KEY);
    if (!raw) return { isPremium: false };
    const parsed: unknown = JSON.parse(raw);
    const isPremium = (parsed as { isPremium?: unknown } | null)?.isPremium === true;
    return { isPremium };
  } catch {
    // Missing/malformed cache never breaks the app — resolve free (AC6).
    return { isPremium: false };
  }
}

export function createFakeEntitlementsProvider(): EntitlementsProvider {
  return {
    refresh: readStoredState,
    restorePurchases: readStoredState,

    async purchasePremium(): Promise<PurchaseResult> {
      // Present the fake billing sheet and await the user's choice.
      const choice = await useFakeBillingStore.getState().open();
      if (choice === 'cancel') return { outcome: 'cancelled' };
      if (choice === 'fail') return { outcome: 'failed', reason: 'payment_declined' };

      const state: EntitlementState = { isPremium: true };
      await AsyncStorage.setItem(FAKE_ENTITLEMENTS_STORAGE_KEY, JSON.stringify(state));
      return { outcome: 'purchased', state };
    },
  };
}
