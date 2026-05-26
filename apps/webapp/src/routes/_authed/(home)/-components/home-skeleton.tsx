import { Skeleton } from '#/components/ui/skeleton';
import { getHomeMessages } from '#/routes/_authed/(home)/-messages';
import { HomeSection } from './home-section';

export function HomeSkeleton() {
  const t = getHomeMessages();

  return (
    <>
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-44 rounded-full" />
          <Skeleton className="h-3 w-28 rounded-full" />
        </div>

        <Skeleton className="size-10 rounded-full" />
      </header>

      <section
        className="mt-8 grid grid-cols-2 gap-4"
        aria-label={t.quickActionsAria}
      >
        <Skeleton className="h-[118px] rounded-[24px]" />
        <Skeleton className="h-[118px] rounded-[24px]" />
      </section>

      <HomeSection title={t.recentGroups} className="mt-7" viewAllTo="/groups">
        <div className="flex flex-col gap-4">
          <HomeTripSkeleton />
          <HomeTripSkeleton />
        </div>
      </HomeSection>

      <HomeSection title={t.savingGoals} className="mt-8" viewAllTo="/goals">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-11 rounded-full" />
          <div className="flex flex-col gap-4">
            <HomeGoalSkeleton />
            <HomeGoalSkeleton />
          </div>
        </div>
      </HomeSection>
    </>
  );
}

function HomeTripSkeleton() {
  return (
    <div className="rounded-[24px] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Skeleton className="h-5 w-36 rounded-full" />
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-4/5 rounded-full" />
      </div>
    </div>
  );
}

function HomeGoalSkeleton() {
  return (
    <div className="rounded-[24px] border border-[#f4f4f4] bg-white px-5 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40 rounded-full" />
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-28 rounded-full" />
      </div>
    </div>
  );
}
