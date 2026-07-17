import { createFakeEntitlementsProvider } from './fake-provider';
import type { EntitlementsProvider } from './types';

// Provider selection (Story 8.2b AC7): callers import ONLY from this module.
//
// TODO(real billing): when EXPO_PUBLIC_REVENUECAT_API_KEY is set, return a
// RevenueCat-backed adapter instead — drop-in contract:
//   - `react-native-purchases` + config plugin + prebuild
//   - refresh()          → Purchases.getCustomerInfo()  → map entitlement
//   - purchasePremium()  → Purchases.purchasePackage()  → map outcome
//                          (userCancelled → 'cancelled', never 'failed')
//   - restorePurchases() → Purchases.restorePurchases() → map entitlement
//   - plus server webhook routers/subscription.ts as the source of truth.
// Zero changes to the store, UI, or analytics call sites (AC7). Until then
// the key is unset everywhere and the local fake provider is always selected.
export const entitlementsProvider: EntitlementsProvider = createFakeEntitlementsProvider();
