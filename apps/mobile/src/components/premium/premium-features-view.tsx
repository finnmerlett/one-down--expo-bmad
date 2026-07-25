import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { PREMIUM_FEATURES } from '@/constants/premium-features';

import { SparklesIcon } from './sparkles-icon';

export type PurchaseStatus = 'idle' | 'purchasing' | 'error' | 'premium';

/**
 * Premium features page body (Stories 8.2a/8.2b, FR61): registry-driven
 * feature list + the single primary CTA. Presentational — the route owns the
 * purchase state machine. `onSubscribe` omitted renders the disabled
 * placeholder (CardBack onStart precedent). Feedback follows the consistency
 * rules: spinner in place on the CTA, inline error near source with an
 * always-visible Retry, calm confirmation replacing the CTA — never a modal.
 */
export function PremiumFeaturesView({
  onSubscribe,
  purchaseStatus = 'idle',
  footer,
}: {
  onSubscribe?: () => void;
  purchaseStatus?: PurchaseStatus;
  footer?: ReactNode;
}) {
  return (
    <ScrollView contentContainerClassName="flex-grow">
      <VStack className="flex-1 gap-6 px-6 pb-8 pt-2">
        <Text className="font-heading text-3xl text-typography-900">One Down Premium</Text>

        <VStack className="gap-4 rounded-3xl border border-outline-100 bg-background-0 p-5">
          {PREMIUM_FEATURES.map((feature, index) => (
            <VStack key={feature.id} className="gap-4">
              {index > 0 ? <Box className="h-px bg-outline-100" /> : null}
              <HStack className="items-start gap-3">
                <Icon as={SparklesIcon} size="md" className="mt-1 text-primary-500" />
                <VStack className="flex-1 gap-1">
                  <Text className="font-body-bold text-base text-typography-900">
                    {feature.title}
                  </Text>
                  <Text className="font-body text-sm text-typography-600">
                    {feature.description}
                  </Text>
                </VStack>
              </HStack>
            </VStack>
          ))}
        </VStack>

        {/* Factual reassurance, no FOMO pressure (FR59). */}
        <Text className="text-center font-body text-sm text-typography-500">
          Everything you already use stays free.
        </Text>

        <Box className="flex-1" />

        {purchaseStatus === 'premium' ? (
          // Calm confirmation, not confetti (quiet satisfaction) — AC2.
          <Text className="text-center font-heading text-lg text-typography-900">
            You’re premium — enjoy!
          </Text>
        ) : (
          <VStack className="gap-3">
            {purchaseStatus === 'error' ? (
              <Text className="text-center font-body-medium text-sm text-error-600">
                Something went wrong with the purchase — nothing was charged.
              </Text>
            ) : null}
            <Button
              size="xl"
              isDisabled={!onSubscribe || purchaseStatus === 'purchasing'}
              onPress={onSubscribe}
              aria-label={purchaseStatus === 'error' ? 'Retry' : 'Subscribe'}
            >
              {purchaseStatus === 'purchasing' ? <ButtonSpinner /> : null}
              <ButtonText>
                {purchaseStatus === 'purchasing'
                  ? 'Purchasing…'
                  : purchaseStatus === 'error'
                    ? 'Retry'
                    : 'Subscribe'}
              </ButtonText>
            </Button>
          </VStack>
        )}

        {footer}
      </VStack>
    </ScrollView>
  );
}
