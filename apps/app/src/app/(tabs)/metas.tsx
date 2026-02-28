import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/splitway/empty-state';
import { SectionCard, SplitwayScreen } from '@/components/splitway/screen';
import { formatCurrency, formatDate, mockGoals } from '@/mocks/splitway-data';
import { Pressable, Text, View } from '@/tw';

export default function GoalsScreen() {
  const router = useRouter();

  return (
    <SplitwayScreen
      title="Metas"
      subtitle="Tus objetivos de ahorro"
      right={
        <Pressable
          onPress={() => router.push('/goals/new')}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-[#4040B0]"
        >
          <MaterialIcons name="add" size={22} color="#FFF" />
        </Pressable>
      }
    >
      <View className="gap-3">
        {mockGoals.length === 0 ? (
          <EmptyState
            icon="flag"
            title="Aún no tienes metas"
            description="Crea una meta y empieza a registrar aportes."
          />
        ) : (
          mockGoals.map((goal) => {
            const progress = Math.min(
              100,
              (goal.totalContributed / goal.targetAmount) * 100,
            );
            return (
              <Pressable
                key={goal.id}
                onPress={() => router.push('/goals/' + goal.id)}
              >
                <SectionCard>
                  <View className="flex-row items-center justify-between">
                    <Text className="font-semibold text-[#1A1A3E]">
                      {goal.name}
                    </Text>
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color="#94A3B8"
                    />
                  </View>
                  <Text className="mt-2 text-sm text-slate-500">
                    ${formatCurrency(goal.totalContributed)} / $
                    {formatCurrency(goal.targetAmount)} {goal.currency}
                  </Text>
                  <View className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <View
                      className="h-full bg-[#4040B0]"
                      style={{ width: `${progress}%` }}
                    />
                  </View>
                  <Text className="mt-2 text-xs text-slate-500">
                    Cierra: {formatDate(goal.endDate)}
                  </Text>
                </SectionCard>
              </Pressable>
            );
          })
        )}
      </View>
    </SplitwayScreen>
  );
}
