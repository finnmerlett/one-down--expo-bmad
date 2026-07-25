import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

import { VStack } from '@/components/ui/vstack';

/**
 * Settings screen scaffold (Story 8.1): a simple composition point — each
 * story contributes its section as a child (8.1 notifications; 5.2 account
 * and 8.2 premium add theirs later) so parallel stories never collide here.
 */
export function SettingsView({ children }: { children: ReactNode }) {
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="flex-grow">
      <VStack className="gap-4 px-4 pb-8 pt-2">{children}</VStack>
    </ScrollView>
  );
}
