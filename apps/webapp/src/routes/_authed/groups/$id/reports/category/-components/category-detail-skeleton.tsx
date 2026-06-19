import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Skeleton } from '#/components/ui/skeleton';
import { getGroupDetailMessages } from '../../../-messages';

export function CategoryDetailSkeleton() {
  const t = getGroupDetailMessages();

  return (
    <MobilePageLayout title={t.reports.categoryDetailTitle} onBack={() => {}}>
      <div className="flex flex-1 flex-col gap-4 pb-8">
        <section className="rounded-[28px] bg-[#111111] p-5 text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
          <div className="flex items-start gap-3">
            <Skeleton className="size-12 shrink-0 rounded-2xl bg-white/10" />

            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-40 rounded-full bg-white/10" />
              <Skeleton className="mt-2 h-3.5 w-28 rounded-full bg-white/10" />
            </div>
          </div>

          <div className="mt-5">
            <Skeleton className="h-9 w-36 rounded-full bg-white/10" />
            <Skeleton className="mt-3 h-4 w-52 rounded-full bg-white/10" />
          </div>

          <Skeleton className="mt-4 h-2.5 rounded-full bg-white/10" />
        </section>

        <section className="flex min-w-0 gap-2 pb-1">
          <Skeleton className="h-10 flex-1 rounded-full bg-[#e2e8f0]" />
          <Skeleton className="h-10 flex-1 rounded-full bg-[#e2e8f0]" />
          <Skeleton className="h-10 flex-1 rounded-full bg-[#e2e8f0]" />
        </section>

        <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-24 rounded-full bg-[#e5e7eb]" />
              <Skeleton className="mt-2 h-3 w-20 rounded-full bg-[#e5e7eb]" />
            </div>
          </div>

          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-2xl bg-[#f8fafc] px-3 py-3"
              >
                <Skeleton className="size-10 shrink-0 rounded-full bg-[#f3f4f6]" />

                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-28 rounded-full bg-[#e5e7eb]" />
                  <Skeleton className="mt-2 h-3 w-36 rounded-full bg-[#e5e7eb]" />
                </div>

                <Skeleton className="h-4 w-16 rounded-full bg-[#e5e7eb]" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="mb-4">
            <Skeleton className="h-4 w-28 rounded-full bg-[#e5e7eb]" />
            <Skeleton className="mt-2 h-3 w-24 rounded-full bg-[#e5e7eb]" />
          </div>

          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, dayIndex) => (
              <div key={dayIndex}>
                <Skeleton className="mb-3 h-4 w-20 rounded-full bg-[#e5e7eb]" />
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((__, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex items-start gap-3">
                        <Skeleton className="size-12 shrink-0 rounded-full bg-[#f3f4f6]" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <Skeleton className="h-4 w-32 rounded-full bg-[#e5e7eb]" />
                              <Skeleton className="mt-2 h-3 w-40 rounded-full bg-[#e5e7eb]" />
                            </div>
                            <div className="shrink-0 text-right">
                              <Skeleton className="ml-auto h-4 w-20 rounded-full bg-[#e5e7eb]" />
                              <Skeleton className="mt-2 ml-auto h-3 w-16 rounded-full bg-[#e5e7eb]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MobilePageLayout>
  );
}
