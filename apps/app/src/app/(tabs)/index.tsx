import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';

import { ScrollView, Text, View } from '@/tw';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
type GroupType = 'viajes' | 'roomates' | 'salidas' | 'otros';

type HomeGroup = {
  id: string;
  name: string;
  type: GroupType;
  participants: number;
  currentUserBalances: Record<string, number>;
};

const categoryConfig: Record<
  GroupType,
  { icon: MaterialIconName; iconColor: string; bgColor: string; label: string }
> = {
  viajes: {
    icon: 'flight-takeoff',
    iconColor: '#2563EB',
    bgColor: '#DBEAFE',
    label: 'Viajes',
  },
  roomates: {
    icon: 'weekend',
    iconColor: '#EA580C',
    bgColor: '#FFEDD5',
    label: 'Roomates',
  },
  salidas: {
    icon: 'local-pizza',
    iconColor: '#DB2777',
    bgColor: '#FCE7F3',
    label: 'Salidas',
  },
  otros: {
    icon: 'apps',
    iconColor: '#475569',
    bgColor: '#E2E8F0',
    label: 'Otros',
  },
};

const groups: HomeGroup[] = [
  {
    id: 'g1',
    name: 'Viaje a Madrid',
    type: 'viajes',
    participants: 3,
    currentUserBalances: {
      USD: 180,
      EUR: 40,
    },
  },
  {
    id: 'g2',
    name: 'Estancia en Barcelona',
    type: 'viajes',
    participants: 3,
    currentUserBalances: {
      EUR: 95,
    },
  },
  {
    id: 'g3',
    name: 'Cumpleanos de Ana',
    type: 'salidas',
    participants: 2,
    currentUserBalances: {
      USD: -120,
    },
  },
  {
    id: 'g4',
    name: 'Excursion a Valencia',
    type: 'otros',
    participants: 4,
    currentUserBalances: {},
  },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getGroupStatus(group: HomeGroup) {
  const total = Object.values(group.currentUserBalances).reduce(
    (acc, value) => acc + value,
    0
  );
  if (total > 0) return { text: 'Te deben', color: 'text-emerald-600' };
  if (total < 0) return { text: 'Debes', color: 'text-red-500' };
  return { text: 'Sin deudas', color: 'text-slate-400' };
}

export default function HomeScreen() {
  const { debtEntries, creditEntries } = useMemo(() => {
    const debtsByCurrency: Record<string, number> = {};
    const creditsByCurrency: Record<string, number> = {};

    for (const group of groups) {
      for (const [currency, balance] of Object.entries(
        group.currentUserBalances ?? {}
      )) {
        if (balance < 0) {
          debtsByCurrency[currency] =
            (debtsByCurrency[currency] ?? 0) + Math.abs(balance);
        } else if (balance > 0) {
          creditsByCurrency[currency] =
            (creditsByCurrency[currency] ?? 0) + balance;
        }
      }
    }

    return {
      debtEntries: Object.entries(debtsByCurrency).sort((a, b) => b[1] - a[1]),
      creditEntries: Object.entries(creditsByCurrency).sort(
        (a, b) => b[1] - a[1]
      ),
    };
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-[#F7F8FC]"
      contentContainerClassName="px-4 pt-8 pb-28">
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="text-4xl font-black text-[#292929]">Hola, Vanessa</Text>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-slate-100">
          <MaterialIcons name="notifications-none" size={20} color="#475569" />
        </View>
      </View>

      <View className="mb-6 rounded-3xl border border-white/60 bg-[#EAF1FF] p-4">
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-white p-4">
            <View className="mb-2 flex-row items-start justify-between">
              <Text className="text-sm text-slate-500">Debes</Text>
              <View className="h-7 w-7 items-center justify-center rounded-full bg-red-100">
                <MaterialIcons name="north-east" size={14} color="#EF4444" />
              </View>
            </View>
            {debtEntries.length === 0 ? (
              <Text className="text-xl font-bold text-[#1a1a3e]">$0</Text>
            ) : (
              <View className="gap-0.5">
                {debtEntries.slice(0, 2).map(([currency, amount]) => (
                  <Text key={currency} className="text-base font-semibold text-[#1a1a3e]">
                    ${formatCurrency(amount)} {currency}
                  </Text>
                ))}
              </View>
            )}
          </View>
          <View className="flex-1 rounded-2xl bg-white p-4">
            <View className="mb-2 flex-row items-start justify-between">
              <Text className="text-sm text-slate-500">Te deben</Text>
              <View className="h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                <MaterialIcons name="south-west" size={14} color="#16A34A" />
              </View>
            </View>
            {creditEntries.length === 0 ? (
              <Text className="text-xl font-bold text-[#1a1a3e]">$0</Text>
            ) : (
              <View className="gap-0.5">
                {creditEntries.slice(0, 2).map(([currency, amount]) => (
                  <Text key={currency} className="text-base font-semibold text-[#1a1a3e]">
                    ${formatCurrency(amount)} {currency}
                  </Text>
                ))}
              </View>
            )}
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
            key={group.id}
            className="flex-row items-center rounded-2xl border border-slate-200 bg-white p-4">
            <View
              className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: categoryConfig[group.type].bgColor }}>
              <MaterialIcons
                name={categoryConfig[group.type].icon}
                size={20}
                color={categoryConfig[group.type].iconColor}
              />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-slate-800">{group.name}</Text>
              <Text className="text-base font-medium text-slate-500">
                {categoryConfig[group.type].label} · {group.participants} participantes
              </Text>
            </View>
            <Text className={`text-base font-bold ${getGroupStatus(group).color}`}>
              {getGroupStatus(group).text}
            </Text>
          </View>
        ))}
      </View>

      <Text className="mt-5 text-lg leading-7 font-medium text-slate-600">
        Ocultamos los grupos sin deudas del último mes.{' '}
        <Text className="font-bold text-indigo-600">Ver todos los grupos</Text>
      </Text>
    </ScrollView>
  );
}
