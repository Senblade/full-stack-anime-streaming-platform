import { CoverGridSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function AnimeLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="mt-6">
        <CoverGridSkeleton count={18} />
      </div>
    </div>
  );
}
