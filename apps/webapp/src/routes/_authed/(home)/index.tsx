import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';

import { Button } from '#/components/ui/button';
import { useAuth } from '#/contexts/auth/use-auth';
import { HomeAction } from '#/routes/_authed/(home)/-components/home-action';
import { homeIcons } from '#/routes/_authed/(home)/-components/home-icons';
import { HomeSection } from '#/routes/_authed/(home)/-components/home-section';
import { HomeSkeleton } from '#/routes/_authed/(home)/-components/home-skeleton';
import { RecentExpenseCard } from '#/routes/_authed/(home)/-components/recent-expense-card';
import { SavingGoalCard } from '#/routes/_authed/(home)/-components/saving-goal-card';
import { TripCard } from '#/routes/_authed/(home)/-components/trip-card';
import {
  emptyHomeData,
  useHomeQuery,
} from '#/routes/_authed/(home)/-hooks/use-home-query';
import { useHomeRecentExpensesQuery } from '#/routes/_authed/(home)/-hooks/use-home-recent-expenses-query';
import { useNotificationsSummaryQuery } from '#/routes/_authed/(home)/-hooks/use-notifications-summary-query';
import { getHomeMessages } from '#/routes/_authed/(home)/-messages';

export const Route = createFileRoute('/_authed/(home)/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const t = getHomeMessages();
  const { user } = useAuth();
  const homeQuery = useHomeQuery();
  const notificationsSummaryQuery = useNotificationsSummaryQuery();
  const data = homeQuery.data ?? emptyHomeData;
  const recentExpensesQuery = useHomeRecentExpensesQuery();
  const userName = user?.name?.trim() || t.fallbackUser;
  const BellIcon = homeIcons.bell;
  const PlusIcon = homeIcons.plus;
  const hasGroups = data.trips.length > 0;
  const hasUnreadNotifications =
    (notificationsSummaryQuery.data?.unreadCount ?? 0) > 0;

  const handleCreateExpense = () => {
    void navigate({ to: '/expenses/new' });
  };

  const handleSelectAction = (action: (typeof data.actions)[number]) => {
    if (action.id === 'create-expense') {
      handleCreateExpense();
    }
  };

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="relative flex min-h-screen w-full flex-col bg-[#fafafa]">
        <div
          className={
            hasGroups
              ? 'flex-1 overflow-y-auto px-4 pb-32 pt-6'
              : 'flex h-full flex-1 flex-col overflow-hidden px-4 pt-6'
          }
        >
          {homeQuery.isLoading ? (
            <HomeSkeleton />
          ) : (
            <div className={hasGroups ? '' : 'flex h-full min-h-0 flex-col'}>
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
                  className="relative rounded-full bg-white shadow-sm"
                  aria-label={t.notificationsAria}
                  onClick={() => navigate({ to: '/notifications' })}
                >
                  <BellIcon />
                  {hasUnreadNotifications ? (
                    <span className="absolute right-0 top-0 size-2 rounded-full bg-primary" />
                  ) : null}
                </Button>
              </header>

              <section
                className="mt-8 grid grid-cols-2 gap-4"
                aria-label={t.quickActionsAria}
              >
                {data.actions.map((action) => (
                  <HomeAction
                    key={action.id}
                    action={action}
                    onSelect={handleSelectAction}
                  />
                ))}
              </section>

              {!hasGroups ? (
                <div className="flex min-h-[calc(100dvh-260px)] items-center justify-center">
                  <div className="flex w-full max-w-[380px] flex-col items-center text-center">
                    <div className="relative flex size-32 items-center justify-center">
                      <div className="absolute right-2 top-4 size-20 rounded-[22px] bg-primary shadow-[0_14px_28px_rgba(222,3,77,0.22)]" />
                      <div className="absolute left-4 top-8 size-20 rounded-[22px] bg-white shadow-[0_18px_36px_rgba(0,0,0,0.05)] ring-1 ring-[#f1f1f1]" />
                      <div className="relative z-10 flex size-16 items-center justify-center overflow-hidden rounded-[18px] bg-white shadow-[0_12px_24px_rgba(0,0,0,0.08)]">
                        <img
                          src="/logo.webp"
                          alt="Vornway"
                          className="size-full object-cover"
                        />
                      </div>
                    </div>

                    <h1 className="mt-5 text-[20px] font-semibold leading-7 text-[#202124]">
                      Todo tu espacio empieza aquí
                    </h1>
                    <p className="mt-2 max-w-[320px] text-sm leading-5 text-[#5e5e5e]">
                      Crea tu primer espacio, organiza tus gastos y define tus
                      metas de ahorro. Vornway te acompaña en cada paso.
                    </p>

                    <Link
                      to="/groups/new"
                      search={{
                        name: '',
                        type: '',
                        description: '',
                        draftId: '',
                      }}
                      className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full border border-[#e8e8e8] bg-white text-base font-medium text-[#202124] shadow-[0_6px_16px_rgba(0,0,0,0.05)] transition-transform active:translate-y-px"
                    >
                      <PlusIcon className="mr-2 size-5" />
                      Crear espacio
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <HomeSection
                    title={t.recentExpenses}
                    className="mt-7"
                    viewAllTo="/expenses/friends"
                  >
                    {recentExpensesQuery.data.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        {recentExpensesQuery.data.map((item) => (
                          <RecentExpenseCard key={item.id} item={item} />
                        ))}
                      </div>
                    ) : recentExpensesQuery.isLoading ? (
                      <div className="flex flex-col gap-4">
                        <div className="h-[84px] rounded-[24px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]" />
                        <div className="h-[84px] rounded-[24px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]" />
                        <div className="h-[84px] rounded-[24px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]" />
                      </div>
                    ) : (
                      <div className="rounded-[28px] border border-dashed border-[#e5e7eb] bg-white px-5 py-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                        <p className="text-base font-semibold text-[#111827]">
                          {t.noRecentExpensesTitle}
                        </p>
                        <p className="mt-2 text-sm text-[#6b7280]">
                          {t.noRecentExpensesCopy}
                        </p>
                        <button
                          type="button"
                          onClick={handleCreateExpense}
                          className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
                        >
                          {t.createExpense}
                        </button>
                      </div>
                    )}
                  </HomeSection>

                  <HomeSection
                    title={t.recentGroups}
                    className="mt-8"
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
                    {data.savingGoals.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        {data.savingGoals.map((goal) => (
                          <SavingGoalCard key={goal.id} goal={goal} />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[28px] border border-dashed border-[#e5e7eb] bg-white px-5 py-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                        <p className="text-base font-semibold text-[#111827]">
                          {t.savingGoals}
                        </p>
                        <p className="mt-2 text-sm text-[#6b7280]">
                          {t.createGoal}
                        </p>
                        <button
                          type="button"
                          onClick={() => void navigate({ to: '/goals/new' })}
                          className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
                        >
                          {t.createGoal}
                        </button>
                      </div>
                    )}
                  </HomeSection>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
