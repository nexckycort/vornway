import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';

import { Text, View } from '@/tw';

type EmptyStateProps = {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  description: string;
};

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View className="items-center rounded-3xl bg-white p-6">
      <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF0FF]">
        <MaterialIcons name={icon} size={28} color="#4040B0" />
      </View>
      <Text className="mb-1 text-center font-semibold text-[#1A1A3E]">{title}</Text>
      <Text className="text-center text-sm text-slate-500">{description}</Text>
    </View>
  );
}
