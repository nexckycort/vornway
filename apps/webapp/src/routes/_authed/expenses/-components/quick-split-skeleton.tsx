export function QuickSplitExpenseSkeleton() {
  return (
    <>
      <div className="space-y-3 px-2 pb-6">
        <div className="flex items-baseline justify-between gap-4">
          <div className="h-10 w-24 rounded-xl bg-[#e5e7eb]" />
          <div className="h-10 w-40 rounded-xl bg-[#e5e7eb]" />
        </div>
        <div className="h-4 w-40 rounded-full bg-[#e5e7eb]" />
      </div>

      <div className="space-y-5 px-2 pb-24">
        <div className="rounded-[24px] border border-[#ebebeb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="h-11 rounded-[24px] bg-[#f3f4f6]" />
        </div>
        <div className="rounded-[24px] border border-[#ebebeb] bg-white px-4 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="space-y-4">
            <div className="h-11 rounded-xl bg-[#f3f4f6]" />
            <div className="h-4 w-24 rounded-full bg-[#e5e7eb]" />
            <div className="flex gap-3">
              <div className="size-11 rounded-full bg-[#e5e7eb]" />
              <div className="size-11 rounded-full bg-[#e5e7eb]" />
              <div className="size-11 rounded-full bg-[#e5e7eb]" />
            </div>
            <div className="h-4 w-24 rounded-full bg-[#e5e7eb]" />
            <div className="space-y-3">
              <div className="h-11 rounded-xl bg-[#f3f4f6]" />
              <div className="h-11 rounded-xl bg-[#f3f4f6]" />
              <div className="h-11 rounded-xl bg-[#f3f4f6]" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
