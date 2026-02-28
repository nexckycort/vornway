import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

import { SectionCard, SplitwayScreen } from '@/components/splitway/screen';
import { mockUser } from '@/mocks/splitway-data';
import { useAuth } from '@/providers/auth-provider';
import { Pressable, Text, View } from '@/tw';

function Row({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <View>
        <Text className="font-medium text-[#1A1A3E]">{title}</Text>
        {subtitle ? (
          <Text className="text-sm text-slate-500">{subtitle}</Text>
        ) : null}
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
    </View>
  );
}

export default function PerfilScreen() {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <SplitwayScreen title="Mi perfil">
      <View className="mb-4 items-center py-5">
        <View className="mb-3 h-24 w-24 items-center justify-center rounded-full bg-[#D8F4F4]">
          <Text className="text-4xl font-semibold text-[#1A1A3E]">
            {mockUser.name.charAt(0)}
          </Text>
        </View>
        <Text className="text-xl font-semibold text-[#1A1A3E]">
          {mockUser.name}
        </Text>
        <Text className="mt-1 text-slate-500">{mockUser.email}</Text>
      </View>

      <View className="gap-4">
        <SectionCard>
          <Text className="mb-1 text-sm font-semibold text-[#1A1A3E]">
            Mis datos personales
          </Text>
          <Row title="Nombre" subtitle={mockUser.name} />
          <View className="h-px bg-slate-100" />
          <Row title="Correo electrónico" subtitle={mockUser.email} />
        </SectionCard>

        <SectionCard>
          <Text className="mb-1 text-sm font-semibold text-[#1A1A3E]">
            Ajustes y preferencias
          </Text>
          <Row title="Idioma" subtitle="Español (Colombia)" />
          <View className="h-px bg-slate-100" />
          <Row title="Notificaciones" subtitle="Activo" />
          <View className="h-px bg-slate-100" />
          <Row title="Apariencia" subtitle="Modo Claro" />
        </SectionCard>

        <SectionCard>
          <Pressable
            onPress={() => {
              logout();
              router.replace('/login');
            }}
            className="h-12 items-center justify-center rounded-xl bg-red-600"
          >
            <Text className="font-medium text-white">Cerrar sesión</Text>
          </Pressable>
        </SectionCard>
      </View>
    </SplitwayScreen>
  );
}
