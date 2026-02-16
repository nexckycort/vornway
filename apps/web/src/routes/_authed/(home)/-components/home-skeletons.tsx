export function HomeSummarySkeleton() {
  return (
    <div className="mt-1 space-y-2 animate-pulse">
      <div className="h-6 w-24 rounded-md bg-[#ececff]" />
      <div className="h-4 w-20 rounded-md bg-[#f1f1fa]" />
    </div>
  );
}

export function HomeGroupsSkeleton() {
  return (
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`group-skeleton-${index}`}
          className="animate-pulse rounded-2xl border border-white/70 bg-white/90 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#ececff]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded-md bg-[#ececff]" />
              <div className="h-3 w-1/3 rounded-md bg-[#f1f1fa]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomeItinerariesSkeleton() {
  return (
    <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={`itinerary-skeleton-${index}`}
          className="animate-pulse rounded-2xl border border-white/70 bg-white/90 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#ececff]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded-md bg-[#ececff]" />
              <div className="h-3 w-1/3 rounded-md bg-[#f1f1fa]" />
              <div className="h-3 w-1/2 rounded-md bg-[#f1f1fa]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
