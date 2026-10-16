import { Skeleton } from "@/components/ui/skeleton";

export default function PartyRoomLoading() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="border-t border-border p-4 lg:w-[360px] lg:border-l lg:border-t-0">
        <Skeleton className="h-10 w-full" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
