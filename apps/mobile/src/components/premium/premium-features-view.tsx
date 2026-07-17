import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { PREMIUM_FEATURES } from '@/constants/premium-features';

import { SparklesIcon } from './sparkles-icon';

/**
 * Premium features page body (Story 8.2a, FR61): registry-driven feature
 * list + the single primary CTA. Presentational — `onSubscribe` omitted
 * renders the disabled placeholder (CardBack onStart precedent); Story 8.2b
 * wires the purchase flow and adds Restore purchases via `footer`.
 */
export function PremiumFeaturesView({
  onSubscribe,
  footer,
}: {
  onSubscribe?: () => void;
  footer?: ReactNode;
}) {
  return (
    <ScrollView contentContainerClassName="flex-grow">
      <VStack className="flex-1 gap-6 px-6 pb-8 pt-2">
        <Text className="text-3xl font-semibold text-typography-900">One Down Premium</Text>

        <VStack className="gap-4">
          {PREMIUM_FEATURES.map((feature, index) => (
            <VStack key={feature.id} className="gap-4">
              {index > 0 ? <Box className="h-px bg-outline-100" /> : null}
              <HStack className="items-start gap-3">
                <Icon as={SparklesIcon} size="md" className="mt-1 text-primary-600" />
                <VStack className="flex-1 gap-1">
                  <Text className="text-base font-semibold text-typography-900">
                    {feature.title}
                  </Text>
                  <Text className="text-sm text-typography-600">{feature.description}</Text>
                </VStack>
              </HStack>
            </VStack>
          ))}
        </VStack>

        {/* Factual reassurance, no FOMO pressure (FR59). */}
        <Text className="text-sm text-typography-500">Everything you already use stays free.</Text>

        <Box className="flex-1" />

        <Button size="xl" isDisabled={!onSubscribe} onPress={onSubscribe} aria-label="Subscribe">
          <ButtonText>Subscribe</ButtonText>
        </Button>

        {footer}
      </VStack>
    </ScrollView>
  );
}
