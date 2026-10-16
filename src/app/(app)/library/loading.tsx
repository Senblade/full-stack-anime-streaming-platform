import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function LibraryLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-5">
        <ListSkeleton rows={6} />
      </div>
    </div>
  );
}
