import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Skeleton } from '#/components/ui/skeleton';

export function AddExpenseSkeleton({
  onBack,
  title,
}: {
  onBack: () => void;
  title: string;
}) {
  return (
    <MobilePageLayout title={title} onBack={onBack}>
      <div className="space-y-5 px-2 pb-28">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-14 flex-1 rounded-2xl" />
          </div>
          <Skeleton className="h-5 w-36 rounded-full" />
        </div>

        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    </MobilePageLayout>
  );
}
