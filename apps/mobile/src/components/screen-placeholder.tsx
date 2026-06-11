import { APP_NAME } from '@one-down/shared';
import { Text, View } from 'react-native';

// Scaffold placeholder until Story 1.1 builds the real app shell. Its NativeWind
// classes double as the end-to-end proof of the styling pipeline.
export function ScreenPlaceholder() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-semibold text-neutral-900">Welcome to Expo</Text>
      <Text className="mt-2 text-sm text-neutral-500">
        {APP_NAME} scaffold — edit src/app/index.tsx
      </Text>
    </View>
  );
}
