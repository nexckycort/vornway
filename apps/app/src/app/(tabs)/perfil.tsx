import { Pressable, Text, View } from '@/tw';
import { useAuth } from '@/providers/auth-provider';

export default function PerfilScreen() {
  const { logout } = useAuth();

  return (
    <View className="flex-1 items-center justify-center bg-[#F7F8FC] px-6">
      <View className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6">
        <Text className="text-3xl font-black text-slate-900">Perfil</Text>
        <Text className="mt-2 text-lg text-slate-500">Sesion mock iniciada.</Text>

        <Pressable
          onPress={logout}
          className="mt-6 items-center rounded-xl bg-red-600 px-4 py-3 active:opacity-80">
          <Text className="font-semibold text-white">Cerrar sesion</Text>
        </Pressable>
      </View>
    </View>
  );
}
