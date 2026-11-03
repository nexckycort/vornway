export function SessionSkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4"
        >
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-2xl bg-[#e2e8f0]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded-full bg-[#e2e8f0]" />
              <div className="h-3 w-1/2 rounded-full bg-[#e2e8f0]" />
              <div className="h-3 w-3/4 rounded-full bg-[#e2e8f0]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
