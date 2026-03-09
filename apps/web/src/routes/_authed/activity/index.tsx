import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  CircleDollarSign,
  Pencil,
  Trash2,
  UserMinus,
  Users,
} from 'lucide-react';
import { GradientLayout } from '~/components/gradient-layout';
import { getActivityFeed } from './-actions/get-activity-feed';

export const Route = createFileRoute('/_authed/activity/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => getActivityFeed(),
  });

  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));

  const getActivityConfig = (action: string) => {
    if (action === 'group.created') {
      return {
        title: 'Creó un grupo',
        icon: Users,
        iconClasses: 'bg-[#e8e4f8] text-[#5a51b3]',
      };
    }

    if (action === 'expense.created') {
      return {
        title: 'Agregó un gasto',
        icon: CircleDollarSign,
        iconClasses: 'bg-[#e4f6ee] text-[#2f855a]',
      };
    }

    if (action === 'expense.updated') {
      return {
        title: 'Editó un gasto',
        icon: Pencil,
        iconClasses: 'bg-[#fff4e5] text-[#b7791f]',
      };
    }

    if (action === 'expense.deleted') {
      return {
        title: 'Eliminó un gasto',
        icon: Trash2,
        iconClasses: 'bg-[#fde8e8] text-[#c53030]',
      };
    }

    if (action === 'member.removed') {
      return {
        title: 'Eliminó un participante',
        icon: UserMinus,
        iconClasses: 'bg-[#fde8e8] text-[#c53030]',
      };
    }

    if (action === 'goal.created') {
      return {
        title: 'Creó una meta',
        icon: Users,
        iconClasses: 'bg-[#e6f5ff] text-[#2b6cb0]',
      };
    }

    if (action === 'goal.contribution.created') {
      return {
        title: 'Registró un aporte a',
        icon: CircleDollarSign,
        iconClasses: 'bg-[#e4f6ee] text-[#2f855a]',
      };
    }

    if (action === 'goal.contribution.deleted') {
      return {
        title: 'Eliminó un aporte de',
        icon: Trash2,
        iconClasses: 'bg-[#fde8e8] text-[#c53030]',
      };
    }

    if (action === 'goal.deleted') {
      return {
        title: 'Eliminó un objetivo',
        icon: Trash2,
        iconClasses: 'bg-[#fde8e8] text-[#c53030]',
      };
    }

    return {
      title: 'Realizó una acción',
      icon: Users,
      iconClasses: 'bg-[#edf2f7] text-[#4a5568]',
    };
  };

  const formatCurrency = (amount: number) => {
    const truncatedAmount = Math.trunc(amount * 100) / 100;

    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(truncatedAmount);
  };

  const getActivityAmount = (details: unknown) => {
    if (!details || typeof details !== 'object') return null;

    const amount =
      Reflect.get(details, 'amount') ?? Reflect.get(details, 'targetAmount');
    const currency = Reflect.get(details, 'currency');

    if (typeof amount !== 'number' || typeof currency !== 'string') {
      return null;
    }

    return { amount, currency };
  };

  const activities = data?.activities ?? [];

  return (
    <GradientLayout className="native-enter pb-20">
      <div className="min-h-screen px-5 pt-5 lg:px-6 lg:pt-6">
        <div className="native-surface-muted mb-5 px-4 py-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1a3e]">Actividad</h1>
        </div>

        {isLoading && (
          <div className="bg-white rounded-2xl p-6 text-center text-gray-500">
            Cargando actividad...
          </div>
        )}

        {!isLoading && error && (
          <div className="bg-white rounded-2xl p-6 text-center text-red-500">
            No se pudo cargar la actividad.
          </div>
        )}

        {!isLoading && !error && activities.length === 0 && (
          <div className="bg-white rounded-2xl p-6 text-center text-gray-500">
            Aún no hay actividad registrada.
          </div>
        )}

        {!isLoading && !error && activities.length > 0 && (
          <div className="space-y-3 pb-6 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {activities.map((activity) => {
              const config = getActivityConfig(activity.action);
              const Icon = config.icon;
              const activityAmount = getActivityAmount(activity.details);

              return (
                <article
                  key={activity.id}
                  className="h-full bg-white rounded-2xl p-4 border border-gray-100"
                >
                  <div className="flex gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${config.iconClasses}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[#1a1a3e] font-medium">
                        <span className="font-semibold">
                          {activity.actorName}
                        </span>{' '}
                        {config.title}
                        {activity.targetName ? (
                          <>
                            {' '}
                            <span className="font-semibold">
                              {activity.targetName}
                            </span>
                          </>
                        ) : null}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {activity.group.name} ·{' '}
                        {formatDateTime(activity.createdAt)}
                      </p>
                      {activityAmount && (
                        <p className="text-sm font-semibold text-[#1a1a3e] mt-1">
                          Valor: ${formatCurrency(activityAmount.amount)}{' '}
                          {activityAmount.currency}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </GradientLayout>
  );
}
