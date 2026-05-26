import { createFileRoute } from '@tanstack/react-router';

import { Button } from '#/components/ui/button';
import { useAuth } from '#/contexts/auth/use-auth';
import { HomeAction } from '#/routes/_authed/(home)/-components/home-action';
import { homeIcons } from '#/routes/_authed/(home)/-components/home-icons';
import { HomeSection } from '#/routes/_authed/(home)/-components/home-section';
import { HomeSkeleton } from '#/routes/_authed/(home)/-components/home-skeleton';
import { SavingGoalCard } from '#/routes/_authed/(home)/-components/saving-goal-card';
import { TripCard } from '#/routes/_authed/(home)/-components/trip-card';
import {
  emptyHomeData,
  useHomeQuery,
} from '#/routes/_authed/(home)/-hooks/use-home-query';
import { getHomeMessages } from '#/routes/_authed/(home)/-messages';

export const Route = createFileRoute('/_authed/(home)/')({
  component: RouteComponent,
});

function RouteComponent() {
  const t = getHomeMessages();
  const { user } = useAuth();
  const homeQuery = useHomeQuery();
  const data = homeQuery.data ?? emptyHomeData;
  const userName = user?.name?.trim() || t.fallbackUser;
  const BellIcon = homeIcons.bell;
  const PlusIcon = homeIcons.plus;

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="relative flex min-h-screen w-full flex-col bg-[#fafafa]">
        <div className="flex-1 overflow-y-auto px-4 pb-32 pt-6">
          {homeQuery.isLoading ? (
            <HomeSkeleton />
          ) : (
            <>
              <header className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg leading-7">
                    {t.greeting}&nbsp;
                    <span className="font-semibold text-primary">
                      {userName}
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
                  aria-label={t.notificationsAria}
                >
                  <BellIcon />
                </Button>
              </header>

              <section
                className="mt-8 grid grid-cols-2 gap-4"
                aria-label={t.quickActionsAria}
              >
                {data.actions.map((action) => (
                  <HomeAction key={action.id} action={action} />
                ))}
              </section>

              <HomeSection
                title={t.recentGroups}
                className="mt-7"
                viewAllTo="/groups"
              >
                <div className="flex flex-col gap-4">
                  {data.trips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </HomeSection>

              <HomeSection
                title={t.savingGoals}
                className="mt-8"
                viewAllTo="/goals"
              >
                <div className="flex flex-col gap-5">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-full bg-white text-base shadow-sm"
                  >
                    <PlusIcon data-icon="inline-start" />
                    {t.createGoal}
                  </Button>

                  <div className="flex flex-col gap-4">
                    {data.savingGoals.map((goal) => (
                      <SavingGoalCard key={goal.id} goal={goal} />
                    ))}
                  </div>
                </div>
              </HomeSection>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
