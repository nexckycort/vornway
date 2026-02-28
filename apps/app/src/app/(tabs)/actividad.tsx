import { EmptyState } from '@/components/splitway/empty-state';
import { SectionCard, SplitwayScreen } from '@/components/splitway/screen';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import {
  formatCurrency,
  formatDateTime,
  mockActivity,
} from '@/mocks/splitway-data';
import { Text, View } from '@/tw';

function getActivityMeta(action: string) {
  if (action === 'group.created') {
    return {
      title: 'Creó un grupo',
      icon: 'groups',
      iconBg: 'bg-indigo-100',
      iconColor: '#5A51B3',
    };
  }
  if (action === 'expense.created') {
    return {
      title: 'Agregó un gasto',
      icon: 'payments',
      iconBg: 'bg-emerald-100',
      iconColor: '#2F855A',
    };
  }
  if (action === 'expense.updated') {
    return {
      title: 'Editó un gasto',
      icon: 'edit',
      iconBg: 'bg-amber-100',
      iconColor: '#B7791F',
    };
  }
  if (action === 'expense.deleted') {
    return {
      title: 'Eliminó un gasto',
      icon: 'delete-outline',
      iconBg: 'bg-red-100',
      iconColor: '#C53030',
    };
  }
  if (action === 'member.removed') {
    return {
      title: 'Eliminó un participante',
      icon: 'person-remove',
      iconBg: 'bg-red-100',
      iconColor: '#C53030',
    };
  }
  if (action === 'goal.created') {
    return {
      title: 'Creó una meta',
      icon: 'flag',
      iconBg: 'bg-blue-100',
      iconColor: '#2B6CB0',
    };
  }
  if (action === 'goal.contribution.created') {
    return {
      title: 'Registró un aporte a',
      icon: 'savings',
      iconBg: 'bg-emerald-100',
      iconColor: '#2F855A',
    };
  }
  return {
    title: 'Realizó una acción',
    icon: 'bolt',
    iconBg: 'bg-slate-100',
    iconColor: '#4A5568',
  };
}

export default function ActivityScreen() {
  return (
    <SplitwayScreen title="Actividad">
      <View className="gap-3">
        {mockActivity.length === 0 ? (
          <EmptyState
            icon="timeline"
            title="Aún no hay actividad"
            description="Los movimientos de grupos y metas aparecerán aquí."
          />
        ) : (
          mockActivity.map((activity) => {
            const meta = getActivityMeta(activity.action);
            return (
              <SectionCard key={activity.id}>
                <View className="flex-row gap-3">
                  <View
                    className={`h-11 w-11 items-center justify-center rounded-xl ${meta.iconBg}`}
                  >
                    <MaterialIcons
                      name={meta.icon as any}
                      size={20}
                      color={meta.iconColor}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] text-[#1A1A3E]">
                      <Text className="font-semibold">
                        {activity.actorName}
                      </Text>{' '}
                      {meta.title}{' '}
                      {activity.targetName ? (
                        <Text className="font-semibold">
                          {activity.targetName}
                        </Text>
                      ) : null}
                    </Text>
                    <Text className="mt-1 text-sm text-slate-500">
                      {activity.groupName} ·{' '}
                      {formatDateTime(activity.createdAt)}
                    </Text>
                    {activity.amount && activity.currency ? (
                      <Text className="mt-1 text-sm font-semibold text-[#1A1A3E]">
                        Valor: ${formatCurrency(activity.amount)}{' '}
                        {activity.currency}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </SectionCard>
            );
          })
        )}
      </View>
    </SplitwayScreen>
  );
}
