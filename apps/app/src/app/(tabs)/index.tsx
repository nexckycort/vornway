import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';

import { ScrollView, Text, View } from '@/tw';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

const groups = [
  {
    name: 'Viaje a Madrid',
    participants: 3,
    status: 'Te deben',
    statusColor: 'text-emerald-500',
    icon: 'flight-takeoff' as MaterialIconName,
  },
  {
    name: 'Estancia en Barcelona',
    participants: 3,
    status: 'Te deben',
    statusColor: 'text-emerald-500',
    icon: 'flight-takeoff' as MaterialIconName,
  },
  {
    name: 'Cumpleanos de Ana',
    participants: 2,
    status: 'Debes',
    statusColor: 'text-red-500',
    icon: 'celebration' as MaterialIconName,
  },
  {
    name: 'Excursion a Valencia',
    participants: 4,
    status: 'Sin deudas',
    statusColor: 'text-slate-400',
    icon: 'flight-takeoff' as MaterialIconName,
  },
];

export default function HomeScreen() {
  return (
    <ScrollView
      className="flex-1 bg-[#F7F8FC]"
      contentContainerClassName="px-4 pt-8 pb-28">
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="text-4xl font-black text-slate-900">Hola, Vanessa</Text>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-slate-100">
          <MaterialIcons name="notifications-none" size={20} color="#475569" />
        </View>
      </View>

      <View className="mb-6 rounded-3xl bg-[#E8EBFA] p-4">
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-white p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <MaterialIcons name="north-east" size={14} color="#EF4444" />
              <Text className="font-semibold text-slate-700">Debes</Text>
            </View>
            <Text className="text-3xl font-extrabold text-slate-900">$0</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-white p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <MaterialIcons name="south-west" size={14} color="#16A34A" />
              <Text className="font-semibold text-slate-700">Te deben</Text>
            </View>
            <Text className="text-3xl font-extrabold text-slate-900">$0</Text>
          </View>
        </View>
      </View>

      <Text className="mb-3 text-3xl font-black text-slate-800">Tus grupos</Text>
      <View className="mb-4 flex-row items-center gap-3">
        <View className="h-12 flex-1 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4">
          <MaterialIcons name="search" size={20} color="#94A3B8" />
          <Text className="ml-2 text-[20px] font-semibold text-slate-300">
            Buscar grupos o gastos
          </Text>
        </View>
        <View className="h-12 w-12 items-center justify-center rounded-full border-2 border-indigo-500 bg-white">
          <MaterialIcons name="filter-alt" size={18} color="#4F46E5" />
        </View>
      </View>

      <View className="gap-3">
        {groups.map((group) => (
          <View
            key={group.name}
            className="flex-row items-center rounded-2xl border border-slate-200 bg-white p-4">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
              <MaterialIcons name={group.icon} size={20} color="#1E7493" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-slate-800">{group.name}</Text>
              <Text className="text-xl font-semibold text-slate-500">
                {group.participants} Participantes
              </Text>
            </View>
            <Text className={`text-xl font-bold ${group.statusColor}`}>
              {group.status}
            </Text>
          </View>
        ))}
      </View>

      <Text className="mt-5 text-[30px] leading-9 font-medium text-slate-600">
        Ocultamos los grupos sin deudas del último mes.{' '}
        <Text className="font-bold text-indigo-600">Ver todos los grupos</Text>
      </Text>
    </ScrollView>
  );
}
