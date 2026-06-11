import { APP_NAME } from '@one-down/shared';
import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-semibold text-neutral-900">Welcome to Expo</Text>
      <Text className="mt-2 text-sm text-neutral-500">
        {APP_NAME} scaffold — edit src/app/index.tsx
      </Text>
    </View>
  );
}
