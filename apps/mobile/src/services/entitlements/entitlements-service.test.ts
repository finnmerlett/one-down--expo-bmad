import AsyncStorage from '@react-native-async-storage/async-storage';

import { setAnalyticsClient } from '@/lib/analytics/track';
import { useEntitlementsStore } from '@/stores/entitlements-store';
import { useFakeBillingStore } from '@/stores/fake-billing-store';

import { FAKE_ENTITLEMENTS_STORAGE_KEY } from './fake-provider';
import { purchasePremium, refreshEntitlements, restorePurchases } from './entitlements-service';

// Official pre-built mock (in-memory Map) — not a hand-rolled mock wall.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Integration through the REAL chain: service → provider singleton →
// fake-billing store (outcome driven via settle, as the sheet UI would).
describe('entitlements service', () => {
  let capture: jest.Mock;

  beforeEach(async () => {
    await AsyncStorage.clear();
    capture = jest.fn();
    setAnalyticsClient({ capture });
  });

  afterEach(() => {
    setAnalyticsClient(null);
    useEntitlementsStore.setState({ isPremium: false });
    useFakeBillingStore.setState({ request: null });
  });

  it('purchased → store flips premium; initiated + completed tracked', async () => {
    const result = purchasePremium();
    useFakeBillingStore.getState().settle('buy');
    await expect(result).resolves.toEqual({
      outcome: 'purchased',
      state: { isPremium: true },
    });

    expect(useEntitlementsStore.getState().isPremium).toBe(true);
    expect(capture.mock.calls).toEqual([
      ['purchase_initiated', { product: 'premium_monthly' }],
      ['purchase_completed', { product: 'premium_monthly' }],
    ]);
  });

  it('cancelled → store untouched; emits purchase_cancelled, never purchase_failed (AC3)', async () => {
    const result = purchasePremium();
    useFakeBillingStore.getState().settle('cancel');
    await expect(result).resolves.toEqual({ outcome: 'cancelled' });

    expect(useEntitlementsStore.getState().isPremium).toBe(false);
    expect(capture.mock.calls).toEqual([
      ['purchase_initiated', { product: 'premium_monthly' }],
      ['purchase_cancelled', { product: 'premium_monthly' }],
    ]);
  });

  it('failed → store untouched; purchase_failed carries the reason (AC4)', async () => {
    const result = purchasePremium();
    useFakeBillingStore.getState().settle('fail');
    await expect(result).resolves.toEqual({ outcome: 'failed', reason: 'payment_declined' });

    expect(useEntitlementsStore.getState().isPremium).toBe(false);
    expect(capture.mock.calls).toEqual([
      ['purchase_initiated', { product: 'premium_monthly' }],
      ['purchase_failed', { product: 'premium_monthly', reason: 'payment_declined' }],
    ]);
  });

  it('restore with a previous purchase → unlock + purchases_restored true (AC5)', async () => {
    await AsyncStorage.setItem(FAKE_ENTITLEMENTS_STORAGE_KEY, JSON.stringify({ isPremium: true }));

    await expect(restorePurchases()).resolves.toEqual({ restored: true });

    expect(useEntitlementsStore.getState().isPremium).toBe(true);
    expect(capture.mock.calls).toEqual([['purchases_restored', { restored: true }]]);
  });

  it('restore with nothing to restore → purchases_restored false (AC5)', async () => {
    await expect(restorePurchases()).resolves.toEqual({ restored: false });

    expect(useEntitlementsStore.getState().isPremium).toBe(false);
    expect(capture.mock.calls).toEqual([['purchases_restored', { restored: false }]]);
  });

  it('launch refresh hydrates the store silently — no analytics event (AC6)', async () => {
    await AsyncStorage.setItem(FAKE_ENTITLEMENTS_STORAGE_KEY, JSON.stringify({ isPremium: true }));

    await refreshEntitlements();

    expect(useEntitlementsStore.getState().isPremium).toBe(true);
    expect(capture).not.toHaveBeenCalled();
  });
});
