export function GoalsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-[28px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
        />
      ))}
    </div>
  );
}
