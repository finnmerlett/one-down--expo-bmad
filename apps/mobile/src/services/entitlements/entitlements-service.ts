import { track } from '@/lib/analytics/track';
import { useEntitlementsStore } from '@/stores/entitlements-store';

import { entitlementsProvider } from './provider';
import type { PurchaseResult } from './types';

// Thin orchestration between the provider, the entitlements store, and the
// analytics seam (Story 8.2b). Purchase/restore are awaited by the premium
// page for its state machine; refresh is fire-and-forget at launch.

const PRODUCT = 'premium_monthly' as const;

/** Launch hydration (AC6) — a purchased entitlement survives restarts. */
export async function refreshEntitlements(): Promise<void> {
  const state = await entitlementsProvider.refresh();
  useEntitlementsStore.getState().setPremium(state.isPremium);
  // No event on launch refresh — hot-path noise (logging-best-practices).
}

export async function purchasePremium(): Promise<PurchaseResult> {
  track('purchase_initiated', { product: PRODUCT });
  const result = await entitlementsProvider.purchasePremium();
  if (result.outcome === 'purchased') {
    useEntitlementsStore.getState().setPremium(result.state.isPremium);
    track('purchase_completed', { product: PRODUCT });
  } else if (result.outcome === 'cancelled') {
    // Cancellation is not a failure (AC3) — tracked as its own outcome.
    track('purchase_cancelled', { product: PRODUCT });
  } else {
    track('purchase_failed', { product: PRODUCT, reason: result.reason });
  }
  return result;
}

export async function restorePurchases(): Promise<{ restored: boolean }> {
  const state = await entitlementsProvider.restorePurchases();
  useEntitlementsStore.getState().setPremium(state.isPremium);
  track('purchases_restored', { restored: state.isPremium });
  return { restored: state.isPremium };
}
