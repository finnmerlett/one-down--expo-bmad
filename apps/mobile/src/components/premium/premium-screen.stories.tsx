import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { useFakeBillingStore } from '@/stores/fake-billing-store';

import { FakeBillingSheet } from './fake-billing-sheet';
import type { PurchaseStatus } from './premium-features-view';
import { PremiumScreen } from './premium-screen';

/**
 * Premium with the route's purchase state machine held locally (seeded from
 * args), plus the fake billing sheet the root layout mounts — so on the
 * canvas Subscribe opens the test billing sheet, Buy lands on the
 * confirmation, Simulate failure shows the inline error and Cancel returns
 * to the page, just like local mode in the app. Nothing is persisted;
 * Restore always finds nothing.
 */
function InteractivePremium({
  placeholder = false,
  initialPremium = false,
  initialPurchasing = false,
  initialFailed = false,
  initialRestoreNote = false,
  initialBillingOpen = false,
}: {
  /** Purchase flow not wired: the disabled placeholder CTA. */
  placeholder?: boolean;
  initialPremium?: boolean;
  initialPurchasing?: boolean;
  initialFailed?: boolean;
  initialRestoreNote?: boolean;
  /** Open the fake billing sheet on mount, as if Subscribe was just tapped. */
  initialBillingOpen?: boolean;
}) {
  const [isPremium, setIsPremium] = useState(initialPremium);
  const [purchasing, setPurchasing] = useState(initialPurchasing);
  const [failed, setFailed] = useState(initialFailed);
  const [restoreNote, setRestoreNote] = useState(initialRestoreNote);

  const purchaseStatus: PurchaseStatus = isPremium
    ? 'premium'
    : purchasing
      ? 'purchasing'
      : failed
        ? 'error'
        : 'idle';

  const subscribe = () => {
    setPurchasing(true);
    void useFakeBillingStore
      .getState()
      .open()
      .then((choice) => {
        if (choice === 'buy') setIsPremium(true);
        setFailed(choice === 'fail');
      })
      .finally(() => setPurchasing(false));
  };

  // A pending request lives in a GLOBAL store — cancel it on unmount so the
  // sheet never leaks into the next story. Mount-only: args seed state once.
  useEffect(() => {
    if (initialBillingOpen) subscribe();
    return () => useFakeBillingStore.getState().settle('cancel');
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PremiumScreen
        onBack={() => {}}
        isPremium={isPremium}
        purchaseStatus={purchaseStatus}
        onSubscribe={
          placeholder
            ? undefined
            : () => {
                if (!purchasing) subscribe();
              }
        }
        restoring={false}
        restoreNote={restoreNote}
        onRestore={() => setRestoreNote(true)}
      />
      <FakeBillingSheet />
    </>
  );
}

const meta = {
  title: 'screens/Premium',
  component: InteractivePremium,
} satisfies Meta<typeof InteractivePremium>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The page a free user sees: features, the live Subscribe CTA, restore link. */
export const Subscribe: Story = {};

/** Purchase flow not wired yet (8.2a): the disabled placeholder CTA. */
export const Placeholder: Story = { args: { placeholder: true } };

/** Subscribe tapped: the fake "Test billing" sheet over the page. */
export const BillingSheetOpen: Story = { args: { initialBillingOpen: true } };

/** Purchase in flight: spinner in place on the CTA, disabled. */
export const Purchasing: Story = { args: { initialPurchasing: true } };

/** Purchase failed: inline error near the CTA, which becomes Retry. */
export const PurchaseError: Story = { args: { initialFailed: true } };

/** Restore found nothing: the calm inline note under the link. */
export const NothingToRestore: Story = { args: { initialRestoreNote: true } };

/** Entitled: calm confirmation replaces the CTA; no restore link. */
export const Confirmation: Story = { args: { initialPremium: true } };
