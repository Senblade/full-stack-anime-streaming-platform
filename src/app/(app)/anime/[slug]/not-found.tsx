import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AnimeNotFound() {
  return (
    <EmptyState
      icon={<SearchX className="h-6 w-6" />}
      title="We couldn't find that anime"
      description="It may have been removed from the catalog, or the link is wrong."
      action={<ButtonLink href="/anime">Back to browse</ButtonLink>}
    />
  );
}
