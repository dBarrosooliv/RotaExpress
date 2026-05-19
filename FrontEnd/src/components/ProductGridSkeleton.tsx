import { GlassCard } from "./GlassCard";

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <GlassCard key={i} className="overflow-hidden">
          <div className="aspect-[4/3] animate-pulse bg-white/5" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
            <div className="h-9 w-full animate-pulse rounded-xl bg-white/10" />
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
