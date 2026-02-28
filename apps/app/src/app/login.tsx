import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Pressable, Text, TextInput, View } from '@/tw';
import { useAuth } from '@/providers/auth-provider';

const allowedDomains = [
  'gmail.com',
  'outlook.com',
  'outlook.es',
  'hotmail.com',
  'hotmail.es',
  'yahoo.com',
  'yahoo.es',
  'icloud.com',
  'live.com',
  'msn.com',
  'protonmail.com',
  'proton.me',
];

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return Boolean(domain && allowedDomains.includes(domain));
}

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();

  const [step, setStep] = useState<'email' | 'name'>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) {
    router.replace('/(tabs)');
    return null;
  }

  return (
    <View className="flex-1 items-center justify-center bg-[#F5F3FA] px-5">
      <View className="mb-5 h-20 w-20 items-center justify-center rounded-3xl bg-[#E8E4F8]">
        <MaterialIcons name="call-split" size={42} color="#4040B0" />
      </View>

      <Text className="mb-1 text-2xl font-bold tracking-tight text-[#1A1A3E]">
        {step === 'email' ? 'Bienvenido a SplitWay' : 'Crear cuenta'}
      </Text>
      <Text className="mb-6 text-sm text-[#4A4A6A]">
        {step === 'email'
          ? 'Ingresa tu correo electrónico para continuar'
          : 'Ingresa tu nombre para completar el registro'}
      </Text>

      <View className="w-full max-w-sm rounded-3xl border border-white/60 bg-blue-50/90 p-6">
        {step === 'email' ? (
          <>
            <Pressable className="mb-4 h-14 items-center justify-center rounded-2xl border border-[#D9D9E8] bg-white">
              <Text className="text-base font-medium text-[#1A1A3E]">
                Continuar con Google (mock)
              </Text>
            </Pressable>

            <View className="mb-4 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-[#D9D9E8]" />
              <Text className="text-xs text-[#6A6A86]">o con correo</Text>
              <View className="h-px flex-1 bg-[#D9D9E8]" />
            </View>

            <Text className="mb-2 text-sm text-[#1A1A3E]">Correo electrónico</Text>
            <TextInput
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError('');
              }}
              placeholder="tu@correo.com"
              className="rounded-2xl border-2 border-slate-200 bg-white px-4 py-3.5"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {error ? <Text className="mt-2 text-sm text-red-500">{error}</Text> : null}

            <Pressable
              onPress={() => {
                if (!validateEmail(email)) {
                  setError('Usa un correo de Gmail, Outlook, Yahoo o iCloud');
                  return;
                }
                setError('');
                setStep('name');
              }}
              className="mt-5 h-14 items-center justify-center rounded-2xl bg-[#4040B0] disabled:opacity-50">
              <Text className="text-base font-medium text-white">Continuar</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="mb-2 text-sm text-[#1A1A3E]">Nombre completo</Text>
            <TextInput
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError('');
              }}
              placeholder="Tu nombre"
              className="rounded-2xl border-2 border-slate-200 bg-white px-4 py-3.5"
            />
            {error ? <Text className="mt-2 text-sm text-red-500">{error}</Text> : null}

            <Pressable
              onPress={() => {
                if (!name.trim()) {
                  setError('El nombre es obligatorio');
                  return;
                }
                login();
                router.replace('/login/otp?email=' + encodeURIComponent(email));
              }}
              className="mt-5 h-14 items-center justify-center rounded-2xl bg-[#4040B0]">
              <Text className="text-base font-medium text-white">Enviar código</Text>
            </Pressable>

            <Pressable onPress={() => setStep('email')} className="mt-3 items-center py-2">
              <Text className="text-sm font-medium text-[#1A1A3E]">Volver</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
