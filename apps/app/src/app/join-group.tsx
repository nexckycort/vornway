import { Stack } from 'expo-router';

import { Text, TextInput, View } from '@/tw';

export default function JoinGroupScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Unirse' }} />
      <View className="flex-1 bg-[#F7F8FC] px-6 pt-10">
        <Text className="text-3xl font-black text-slate-900">
          Te invitaron a un grupo o a una meta
        </Text>
        <Text className="mt-2 text-lg text-slate-500">
          Pega el enlace de invitacion para continuar.
        </Text>

        <View className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <Text className="mb-2 text-sm font-medium text-slate-600">Enlace de invitacion</Text>
          <TextInput
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
            placeholder="https://splitway.app/join/abc123"
            autoCapitalize="none"
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>
    </>
  );
}
