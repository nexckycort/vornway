import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Pressable, Text, TextInput, View } from '@/tw';

export default function JoinGroupInputScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');

  return (
    <View className="flex-1 bg-[#F7F8FC] px-6 pt-10">
      <Text className="text-3xl font-black text-slate-900">
        Te invitaron a un grupo o a una meta
      </Text>
      <Text className="mt-2 text-lg text-slate-500">
        Pega el enlace o escribe el código para continuar.
      </Text>

      <View className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="mb-2 text-sm font-medium text-slate-600">Código de invitación</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
          placeholder="MADRID2026"
          autoCapitalize="characters"
          placeholderTextColor="#94A3B8"
        />
      </View>

      <Pressable
        onPress={() => router.push(`/join/${encodeURIComponent(code || 'MADRID2026')}`)}
        className="mt-5 h-12 items-center justify-center rounded-xl bg-[#4040B0]">
        <Text className="font-medium text-white">Continuar</Text>
      </Pressable>
    </View>
  );
}
