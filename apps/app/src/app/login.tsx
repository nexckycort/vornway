import { useAuth } from '@/providers/auth-provider';
import { Pressable, Text, TextInput, View } from '@/tw';
import { Redirect } from 'expo-router';

export default function LoginScreen() {
  const { isAuthenticated, login } = useAuth();

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const onLogin = () => {
    login();
  };

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <View className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
        <Text className="mb-1 text-2xl font-bold text-neutral-900">
          Iniciar sesión
        </Text>
        <Text className="mb-6 text-neutral-600">
          Modo mock para pruebas de navegación.
        </Text>

        <TextInput
          className="mb-3 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900"
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#737373"
        />
        <TextInput
          className="mb-5 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900"
          placeholder="Password"
          secureTextEntry
          placeholderTextColor="#737373"
        />

        <Pressable
          onPress={onLogin}
          className="items-center rounded-xl bg-black px-4 py-3 active:opacity-80"
        >
          <Text className="font-semibold text-white">Login</Text>
        </Pressable>
      </View>
    </View>
  );
}
