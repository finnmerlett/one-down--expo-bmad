import { useEntitlementsStore } from '@/stores/entitlements-store';

/** The single import point for premium gating checks (Story 8.2a). */
export function useIsPremium(): boolean {
  return useEntitlementsStore((state) => state.isPremium);
}
