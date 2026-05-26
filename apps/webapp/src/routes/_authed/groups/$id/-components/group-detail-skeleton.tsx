import { Skeleton } from '#/components/ui/skeleton';

export function GroupDetailSkeleton() {
  return (
    <main className="min-h-dvh bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[412px] flex-col bg-[#ececec] px-4 pb-8 pt-6">
        <header className="relative px-0 pb-4 pt-0 text-white">
          <div className="mb-3 flex items-start gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full bg-white/10" />
            <div className="min-w-0 flex-1 pt-1">
              <Skeleton className="h-5 w-40 rounded-full bg-white/10" />
              <Skeleton className="mt-2 h-3 w-28 rounded-full bg-white/10" />
            </div>
            <Skeleton className="size-10 shrink-0 rounded-full bg-white/10" />
          </div>

          <section className="overflow-hidden">
            <div className="overflow-hidden pb-2">
              <div className="flex gap-3">
                <div className="min-w-[calc(100%-2rem)] rounded-[24px] bg-[#2c2226] px-5 py-4 shadow-[0_18px_35px_rgba(0,0,0,0.18)]">
                  <Skeleton className="h-4 w-20 rounded-full bg-white/10" />
                  <Skeleton className="mt-3 h-3 w-28 rounded-full bg-white/10" />
                  <Skeleton className="mt-2 h-8 w-40 rounded-full bg-white/10" />
                  <Skeleton className="mt-4 h-3 w-24 rounded-full bg-white/10" />
                </div>
                <div className="min-w-[calc(100%-2rem)] rounded-[24px] bg-[#2c2226] px-5 py-4 shadow-[0_18px_35px_rgba(0,0,0,0.18)]">
                  <Skeleton className="h-4 w-20 rounded-full bg-white/10" />
                  <Skeleton className="mt-3 h-3 w-28 rounded-full bg-white/10" />
                  <Skeleton className="mt-2 h-8 w-40 rounded-full bg-white/10" />
                  <Skeleton className="mt-4 h-3 w-24 rounded-full bg-white/10" />
                </div>
              </div>
            </div>

            <Skeleton className="mt-1 h-3 w-64 rounded-full bg-white/10" />
          </section>

          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex min-w-0 flex-col items-center gap-1"
              >
                <Skeleton className="h-9 w-full rounded-xl bg-white/10" />
                <Skeleton className="h-3 w-10 rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </header>

        <div className="flex flex-1 flex-col rounded-t-[32px] bg-white px-4 pb-8 pt-6 shadow-[0_-16px_40px_rgba(0,0,0,0.12)]">
          <section className="mb-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-28 rounded-full bg-[#e5e7eb]" />
              <Skeleton className="h-3 w-20 rounded-full bg-[#e5e7eb]" />
            </div>

            <div className="flex gap-3 overflow-hidden pb-1">
              <div className="flex min-w-[62px] flex-col items-center gap-1">
                <Skeleton className="size-12 rounded-full bg-[#f3f4f6]" />
                <Skeleton className="h-3 w-10 rounded-full bg-[#f3f4f6]" />
              </div>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-w-[62px] flex-col items-center gap-1"
                >
                  <Skeleton className="size-12 rounded-full bg-[#f3f4f6]" />
                  <Skeleton className="h-3 w-10 rounded-full bg-[#f3f4f6]" />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-5">
            {Array.from({ length: 3 }).map((_, dayIndex) => (
              <div key={dayIndex}>
                <Skeleton className="mb-3 h-4 w-20 rounded-full bg-[#e5e7eb]" />
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((__, expenseIndex) => (
                    <div
                      key={expenseIndex}
                      className="rounded-[22px] border border-[#e5e7eb] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex items-center gap-3.5 px-4 py-2">
                        <Skeleton className="size-12 shrink-0 rounded-full bg-[#f3f4f6]" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <Skeleton className="h-4 w-28 rounded-full bg-[#e5e7eb]" />
                              <Skeleton className="mt-2 h-3 w-40 rounded-full bg-[#e5e7eb]" />
                            </div>
                            <div className="shrink-0 text-right">
                              <Skeleton className="ml-auto h-4 w-20 rounded-full bg-[#e5e7eb]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
