import AsyncStorage from '@react-native-async-storage/async-storage';

import { useFakeBillingStore } from '@/stores/fake-billing-store';

import { createFakeEntitlementsProvider, FAKE_ENTITLEMENTS_STORAGE_KEY } from './fake-provider';

// Official pre-built mock (in-memory Map) — not a hand-rolled mock wall.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('fake entitlements provider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useFakeBillingStore.setState({ request: null });
  });

  it('purchase Buy → persisted and resolves purchased', async () => {
    const provider = createFakeEntitlementsProvider();

    const result = provider.purchasePremium();
    useFakeBillingStore.getState().settle('buy');

    await expect(result).resolves.toEqual({
      outcome: 'purchased',
      state: { isPremium: true },
    });
    await expect(AsyncStorage.getItem(FAKE_ENTITLEMENTS_STORAGE_KEY)).resolves.toBe(
      JSON.stringify({ isPremium: true }),
    );
  });

  it('purchase Cancel → cancelled and nothing persisted', async () => {
    const provider = createFakeEntitlementsProvider();

    const result = provider.purchasePremium();
    useFakeBillingStore.getState().settle('cancel');

    await expect(result).resolves.toEqual({ outcome: 'cancelled' });
    await expect(AsyncStorage.getItem(FAKE_ENTITLEMENTS_STORAGE_KEY)).resolves.toBeNull();
  });

  it('purchase Simulate failure → failed and nothing persisted', async () => {
    const provider = createFakeEntitlementsProvider();

    const result = provider.purchasePremium();
    useFakeBillingStore.getState().settle('fail');

    await expect(result).resolves.toEqual({ outcome: 'failed', reason: 'payment_declined' });
    await expect(AsyncStorage.getItem(FAKE_ENTITLEMENTS_STORAGE_KEY)).resolves.toBeNull();
  });

  it('refresh/restore roundtrip a persisted purchase (AC6)', async () => {
    const provider = createFakeEntitlementsProvider();

    const purchase = provider.purchasePremium();
    useFakeBillingStore.getState().settle('buy');
    await purchase;

    // A fresh provider instance (≈ app restart) still sees the entitlement.
    const restarted = createFakeEntitlementsProvider();
    await expect(restarted.refresh()).resolves.toEqual({ isPremium: true });
    await expect(restarted.restorePurchases()).resolves.toEqual({ isPremium: true });
  });

  it('missing storage resolves free', async () => {
    const provider = createFakeEntitlementsProvider();

    await expect(provider.refresh()).resolves.toEqual({ isPremium: false });
    await expect(provider.restorePurchases()).resolves.toEqual({ isPremium: false });
  });

  it.each([
    ['malformed JSON', 'not-json{'],
    ['wrong shape', JSON.stringify({ isPremium: 'yes' })],
  ])('%s in storage resolves free instead of throwing', async (_label, raw) => {
    await AsyncStorage.setItem(FAKE_ENTITLEMENTS_STORAGE_KEY, raw);
    const provider = createFakeEntitlementsProvider();

    await expect(provider.refresh()).resolves.toEqual({ isPremium: false });
  });
});
