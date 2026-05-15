import { createFileRoute } from '@tanstack/react-router';
import {
  Bell,
  Compass,
  Home,
  type LucideIcon,
  PiggyBank,
  Plus,
  Repeat2,
  Shirt,
  UserRound,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '#/components/ui/button';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/_authed/')({
  component: RouteComponent,
});

type Trip = {
  id: string;
  name: string;
  dates: string;
  avatars: string[];
  extraPeople: number;
} & (
  | {
      balanceLabel: string;
      balanceItems: { person: string; amount: string }[];
      emptyLabel?: never;
    }
  | {
      emptyLabel: string;
      balanceLabel?: never;
      balanceItems?: never;
    }
);

const trips: Trip[] = [
  {
    id: 'europa-balance',
    name: 'Europa trip',
    dates: '4 mar - 8 mar',
    avatars: ['VF', 'NC'],
    extraPeople: 2,
    balanceLabel: 'Te deben $1,000.000',
    balanceItems: [
      { person: 'Nestor', amount: 'Te debe $100.000' },
      { person: 'Nestor', amount: 'Te debe €500' },
    ],
  },
  {
    id: 'europa-empty',
    name: 'Europa trip',
    dates: '4 mar - 8 mar',
    avatars: ['VF', 'NC'],
    extraPeople: 2,
    emptyLabel: 'Sin gastos',
  },
];

const savingGoals = [
  {
    id: 'brasil-2026',
    name: 'Brasil 2026',
    category: 'Viaje',
    saved: '$1.000.000',
    target: '$3.000.00',
    progress: 25,
    icon: Compass,
    iconClassName: 'bg-[#fff0f2] text-primary',
  },
  {
    id: 'travel-accessories',
    name: 'Accesorios de viaje',
    category: 'Insumos',
    saved: '$10.000',
    target: '$30.000',
    progress: 25,
    icon: Shirt,
    iconClassName: 'bg-[#fefce8] text-[#b45309]',
  },
];

const navItems = [
  { label: 'Inicio', icon: Home, active: true },
  { label: 'Viajes', icon: Compass },
  { label: 'Metas', icon: PiggyBank },
  { label: 'Cuenta', icon: UserRound },
];

function RouteComponent() {
  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col overflow-hidden rounded-[30px] bg-[#fafafa] shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
        <div className="flex h-[52px] shrink-0 items-end justify-between px-6 py-2.5 text-sm font-medium">
          <span>9:30</span>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-[17px] rounded-full bg-muted" />
            <span className="h-[17px] w-2.5 rounded-sm bg-foreground" />
            <span className="h-[15px] w-2 rounded-sm border border-foreground bg-foreground" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-xl leading-7">
                Hola,<span className="font-semibold text-primary">Vanessa</span>
              </h1>
              <p className="text-xs leading-4 text-[#626262]">
                Bienvenida a Vornway
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-full bg-white shadow-sm"
              aria-label="Notificaciones"
            >
              <Bell />
            </Button>
          </header>

          <section
            className="mt-8 grid grid-cols-2 gap-4"
            aria-label="Acciones rapidas"
          >
            <HomeAction
              icon={Repeat2}
              label="Convertidor de moneda"
              className="border border-border bg-white text-foreground shadow-[0_10px_20px_rgba(0,0,0,0.04)]"
              iconClassName="bg-[#fff0f2] text-primary"
            />
            <HomeAction
              icon={Compass}
              label="Crear Nuevo viaje"
              className="bg-primary text-primary-foreground shadow-[0_8px_10px_rgba(222,3,77,0.12)]"
              iconClassName="bg-white text-primary"
            />
          </section>

          <HomeSection title="Viajes recientes" className="mt-7">
            <div className="flex flex-col gap-4">
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          </HomeSection>

          <HomeSection title="Metas de ahorro" className="mt-8">
            <div className="flex flex-col gap-5">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full bg-white text-base shadow-sm"
              >
                <Plus data-icon="inline-start" />
                Crear meta
              </Button>

              <div className="flex flex-col gap-4">
                {savingGoals.map((goal) => (
                  <SavingGoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </div>
          </HomeSection>
        </div>

        <BottomNav />
      </div>
    </main>
  );
}

type HomeActionProps = {
  icon: LucideIcon;
  label: string;
  className?: string;
  iconClassName?: string;
};

function HomeAction({
  icon: Icon,
  label,
  className,
  iconClassName,
}: HomeActionProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex min-h-[118px] flex-col items-start justify-between rounded-[24px] p-4 text-left transition-transform active:translate-y-px',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-2xl',
          iconClassName,
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="max-w-[120px] text-sm font-semibold leading-5">
        {label}
      </span>
    </button>
  );
}

type HomeSectionProps = {
  title: string;
  className?: string;
  children: ReactNode;
};

function HomeSection({ title, className, children }: HomeSectionProps) {
  return (
    <section className={cn('flex flex-col gap-5', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold leading-7">{title}</h2>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 text-primary"
        >
          Ver todo
        </Button>
      </div>
      {children}
    </section>
  );
}

type TripCardProps = {
  trip: (typeof trips)[number];
};

function TripCard({ trip }: TripCardProps) {
  return (
    <article className="rounded-[24px] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold leading-7">{trip.name}</h3>
          <p className="text-xs leading-4">{trip.dates}</p>
        </div>

        <div className="flex items-center">
          {trip.avatars.map((avatar) => (
            <span
              key={avatar}
              className="-mr-1.5 flex size-8 items-center justify-center rounded-full border border-border bg-[#fafafa] text-sm font-medium leading-5"
            >
              {avatar}
            </span>
          ))}
          <span className="flex size-8 items-center justify-center rounded-full border border-border bg-white text-sm font-medium leading-5 shadow-sm">
            +{trip.extraPeople}
          </span>
        </div>
      </div>

      {trip.balanceItems ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-base font-medium leading-6 text-[#047857]">
            {trip.balanceLabel}
          </p>
          <div className="flex flex-col gap-1">
            {trip.balanceItems.map((item) => (
              <p
                key={`${item.person}-${item.amount}`}
                className="text-xs leading-4"
              >
                <span className="text-[#4c4c4c]">{item.person}</span>{' '}
                <span className="text-[#047857]">{item.amount}</span>
              </p>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-base font-medium leading-6">
          {trip.emptyLabel}
        </p>
      )}
    </article>
  );
}

type SavingGoalCardProps = {
  goal: (typeof savingGoals)[number];
};

function SavingGoalCard({ goal }: SavingGoalCardProps) {
  const Icon = goal.icon;

  return (
    <article className="rounded-[24px] border border-[#f4f4f4] bg-white px-5 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex size-11 items-center justify-center rounded-2xl',
            goal.iconClassName,
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold leading-6">
            {goal.name}
          </h3>
          <p className="text-xs leading-4 text-[#4c4c4c]">{goal.category}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-[#ebebeb]">
          <div
            className="h-full rounded-r-full bg-primary"
            style={{ width: `${goal.progress}%` }}
          />
        </div>
        <p className="text-sm leading-5">
          <span className="font-bold">{goal.saved}</span>{' '}
          <span className="text-[#797979]">/ {goal.target}</span>
        </p>
      </div>
    </article>
  );
}

function BottomNav() {
  return (
    <nav className="shrink-0 rounded-t-[28px] border-t border-border bg-white px-5 pb-2.5 pt-2.5 shadow-[0_-1px_2.3px_rgba(203,203,203,0.3)]">
      <div className="flex items-end justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              className={cn(
                'flex w-[84px] flex-col items-center justify-end gap-0.5 rounded-xl px-1.5 text-xs font-medium leading-4 text-[#a7a7a7]',
                item.active && 'text-primary',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex justify-center">
        <span className="h-[5px] w-[134px] rounded-full bg-[#a7a7a7]" />
      </div>
    </nav>
  );
}
