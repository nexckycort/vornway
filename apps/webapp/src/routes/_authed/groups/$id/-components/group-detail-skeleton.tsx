export function GroupDetailSkeleton() {
  return (
    <main className="min-h-screen bg-[#111111] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#111111]">
        <header className="px-4 pb-4 pt-5 text-white">
          <div className="mb-3 flex items-start gap-3">
            <div className="size-9 shrink-0 rounded-full bg-white/10" />
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <div className="h-5 w-40 rounded-full bg-white/10" />
              <div className="h-3 w-28 rounded-full bg-white/10" />
            </div>
          </div>

          <section className="rounded-[24px] bg-[#151515] p-3">
            <div className="h-4 w-28 rounded-full bg-white/[0.06]" />
            <div className="-mx-1 mt-2 flex gap-3 overflow-hidden px-1 pb-1">
              <div className="min-w-[calc(100%-1rem)] rounded-[20px] border border-white/10 bg-[#151515] p-3">
                <div className="h-5 w-20 rounded-full bg-white/[0.06]" />
                <div className="mt-2 h-7 w-44 rounded-full bg-white/[0.06]" />
              </div>
              <div className="min-w-[calc(100%-1rem)] rounded-[20px] border border-white/10 bg-[#151515] p-3">
                <div className="h-5 w-20 rounded-full bg-white/[0.06]" />
                <div className="mt-2 h-7 w-44 rounded-full bg-white/[0.06]" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <div className="h-7 w-20 rounded-full bg-white/10" />
              <div className="h-7 w-20 rounded-full bg-white/10" />
            </div>
          </section>

          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex min-w-0 flex-col items-center gap-1">
                <div className="h-9 w-full rounded-xl bg-white/10" />
                <div className="h-3 w-10 rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </header>

        <div className="flex-1 rounded-t-[32px] bg-white px-4 pb-8 pt-6 shadow-[0_-16px_40px_rgba(0,0,0,0.12)]">
          <section className="mb-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="h-4 w-28 rounded-full bg-[#e5e7eb]" />
              <div className="h-3 w-20 rounded-full bg-[#e5e7eb]" />
            </div>
            <div className="flex gap-3 overflow-hidden pb-1">
              <div className="flex min-w-[62px] flex-col items-center gap-1">
                <div className="size-12 rounded-full bg-[#f3f4f6]" />
                <div className="h-3 w-10 rounded-full bg-[#f3f4f6]" />
              </div>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-w-[62px] flex-col items-center gap-1"
                >
                  <div className="size-12 rounded-full bg-[#f3f4f6]" />
                  <div className="h-3 w-10 rounded-full bg-[#f3f4f6]" />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-5">
            {Array.from({ length: 3 }).map((_, dayIndex) => (
              <div key={dayIndex}>
                <div className="mb-3 h-4 w-20 rounded-full bg-[#e5e7eb]" />
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((__, expenseIndex) => (
                    <div
                      key={expenseIndex}
                      className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="size-11 rounded-full bg-[#f3f4f6]" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="h-4 w-40 rounded-full bg-[#e5e7eb]" />
                          <div className="h-3 w-28 rounded-full bg-[#e5e7eb]" />
                          <div className="h-3 w-24 rounded-full bg-[#e5e7eb]" />
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
