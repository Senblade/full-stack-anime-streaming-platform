import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function ReviewsLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-3 h-4 w-72" />
      <div className="mt-6">
        <ListSkeleton rows={4} />
      </div>
    </div>
  );
}
