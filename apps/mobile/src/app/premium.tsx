import { useRouter } from 'expo-router';
import { useState } from 'react';

import type { PurchaseStatus } from '@/components/premium/premium-features-view';
import { PremiumScreen } from '@/components/premium/premium-screen';
import { useIsPremium } from '@/hooks/use-is-premium';
import { purchasePremium, restorePurchases } from '@/services/entitlements/entitlements-service';

// Data + behaviour for the premium page; everything visible is PremiumScreen.
export default function PremiumRoute() {
  const router = useRouter();
  const isPremium = useIsPremium();

  // Page-local purchase state machine (Story 8.2b): idle | purchasing |
  // error | premium. Premium derives from the store, so an already-premium
  // visitor sees the confirmation, not the CTA.
  const [purchasing, setPurchasing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreNote, setRestoreNote] = useState(false);

  const purchaseStatus: PurchaseStatus = isPremium
    ? 'premium'
    : purchasing
      ? 'purchasing'
      : failed
        ? 'error'
        : 'idle';

  const handleSubscribe = () => {
    if (purchasing) return;
    setPurchasing(true);
    void purchasePremium()
      .then((result) => {
        // Cancelled → back to the page unchanged: no error UI (AC3).
        setFailed(result.outcome === 'failed');
      })
      .catch(() => setFailed(true))
      .finally(() => setPurchasing(false));
  };

  const handleRestore = () => {
    if (restoring) return;
    setRestoring(true);
    setRestoreNote(false);
    void restorePurchases()
      .then(({ restored }) => {
        // Restored → the store flip shows the confirmation; nothing to
        // restore → calm inline note (AC5).
        setRestoreNote(!restored);
      })
      .catch(() => setRestoreNote(true))
      .finally(() => setRestoring(false));
  };

  return (
    <PremiumScreen
      onBack={() => router.back()}
      isPremium={isPremium}
      purchaseStatus={purchaseStatus}
      onSubscribe={handleSubscribe}
      restoring={restoring}
      restoreNote={restoreNote}
      onRestore={handleRestore}
    />
  );
}
