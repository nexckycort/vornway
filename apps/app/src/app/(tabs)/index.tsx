import { Pressable, Text, View } from '@/tw';
import { useAuth } from '@/providers/auth-provider';

export default function HomeScreen() {
  const { logout } = useAuth();

  const onLogout = () => {
    logout();
  };

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <View className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
        <Text className="mb-2 text-2xl font-bold text-neutral-900">Home</Text>
        <Text className="mb-6 text-neutral-600">
          Sesión iniciada en modo mock.
        </Text>

        <Pressable
          onPress={onLogout}
          className="items-center rounded-xl bg-red-600 px-4 py-3 active:opacity-80">
          <Text className="font-semibold text-white">Cerrar sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}
