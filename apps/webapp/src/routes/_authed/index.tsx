import { createFileRoute } from '@tanstack/react-router';

import { Button } from '#/components/ui/button';
import { HomeAction } from '#/routes/_authed/(home)/-components/home-action';
import { homeIcons } from '#/routes/_authed/(home)/-components/home-icons';
import { HomeSection } from '#/routes/_authed/(home)/-components/home-section';
import { SavingGoalCard } from '#/routes/_authed/(home)/-components/saving-goal-card';
import { TripCard } from '#/routes/_authed/(home)/-components/trip-card';
import { useHomeQuery } from '#/routes/_authed/(home)/-hooks/use-home-query';

export const Route = createFileRoute('/_authed/')({
  component: RouteComponent,
});

function RouteComponent() {
  const homeQuery = useHomeQuery();
  const { data } = homeQuery;
  const BellIcon = homeIcons.bell;
  const PlusIcon = homeIcons.plus;

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[412px] flex-col overflow-hidden rounded-[30px] bg-[#fafafa] shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
        <div className="flex h-[52px] shrink-0 items-end justify-between px-6 py-2.5 text-sm font-medium">
          <span>9:30</span>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-[17px] rounded-full bg-muted" />
            <span className="h-[17px] w-2.5 rounded-sm bg-foreground" />
            <span className="h-[15px] w-2 rounded-sm border border-foreground bg-foreground" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-32 pt-2">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-xl leading-7">
                Hola,
                <span className="font-semibold text-primary">
                  {data.userName}
                </span>
              </h1>
              <p className="text-xs leading-4 text-[#626262]">
                {data.welcomeText}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-full bg-white shadow-sm"
              aria-label="Notificaciones"
            >
              <BellIcon />
            </Button>
          </header>

          <section
            className="mt-8 grid grid-cols-2 gap-4"
            aria-label="Acciones rapidas"
          >
            {data.actions.map((action) => (
              <HomeAction key={action.id} action={action} />
            ))}
          </section>

          <HomeSection title="Viajes recientes" className="mt-7">
            <div className="flex flex-col gap-4">
              {data.trips.map((trip) => (
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
                <PlusIcon data-icon="inline-start" />
                Crear meta
              </Button>

              <div className="flex flex-col gap-4">
                {data.savingGoals.map((goal) => (
                  <SavingGoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </div>
          </HomeSection>
        </div>

      </div>
    </main>
  );
}
