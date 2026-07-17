// The entitlement provider contract (Story 8.2b). Shaped after RevenueCat's
// model so the real adapter drops in later without touching callers:
// CustomerInfo → EntitlementState, purchasePackage → purchasePremium,
// restorePurchases → restorePurchases, getCustomerInfo → refresh.

export interface EntitlementState {
  isPremium: boolean;
}

export type PurchaseFailureReason = 'network' | 'payment_declined' | 'unknown';

export type PurchaseResult =
  | { outcome: 'purchased'; state: EntitlementState }
  | { outcome: 'cancelled' }
  | { outcome: 'failed'; reason: PurchaseFailureReason };

export interface EntitlementsProvider {
  /** Launch/focus hydration (AC6) — never throws, resolves free on any doubt. */
  refresh(): Promise<EntitlementState>;
  /** Opens the billing UI and resolves with the user's outcome. */
  purchasePremium(): Promise<PurchaseResult>;
  /** Re-apply previously purchased entitlements (AC5). */
  restorePurchases(): Promise<EntitlementState>;
}
