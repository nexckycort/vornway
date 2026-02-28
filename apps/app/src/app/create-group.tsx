import { Stack } from 'expo-router';

import { Text, View } from '@/tw';

export default function CreateGroupScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Crear grupo' }} />
      <View className="flex-1 items-center justify-center bg-[#F7F8FC] px-6">
        <Text className="text-3xl font-black text-slate-900">Crear grupo</Text>
        <Text className="mt-2 text-lg text-slate-500">Flujo mock en construccion.</Text>
      </View>
    </>
  );
}
