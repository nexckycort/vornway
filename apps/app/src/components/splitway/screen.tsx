import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { Pressable, ScrollView, Text, View } from '@/tw';

type SplitwayScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  withBack?: boolean;
  right?: ReactNode;
};

export function SplitwayScreen({
  title,
  subtitle,
  children,
  withBack,
  right,
}: SplitwayScreenProps) {
  const router = useRouter();

  return (
    <ScrollView
      className="flex-1 bg-[#F5F3FA]"
      contentContainerClassName="px-4 pt-5 pb-12">
      <View className="mb-4 flex-row items-center justify-between rounded-2xl bg-white/70 px-3 py-3">
        <View className="flex-1 flex-row items-center gap-2">
          {withBack ? (
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-xl bg-white">
              <MaterialIcons name="arrow-back" size={22} color="#1A1A3E" />
            </Pressable>
          ) : null}
          <View className="flex-1">
            <Text className="text-xl font-bold text-[#1A1A3E]">{title}</Text>
            {subtitle ? <Text className="text-sm text-slate-500">{subtitle}</Text> : null}
          </View>
        </View>
        {right}
      </View>

      {children}
    </ScrollView>
  );
}

export function SectionCard({ children }: { children: ReactNode }) {
  return <View className="rounded-3xl border border-slate-100 bg-white p-4">{children}</View>;
}
