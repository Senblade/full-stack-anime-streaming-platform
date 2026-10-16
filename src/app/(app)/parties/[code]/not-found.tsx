import { Tv } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function PartyNotFound() {
  return (
    <div className="p-6">
      <EmptyState
        icon={<Tv className="h-6 w-6" />}
        title="That room doesn't exist"
        description="Double-check the code with your host — codes are 6 characters, letters and numbers."
        action={<ButtonLink href="/parties">Back to parties</ButtonLink>}
      />
    </div>
  );
}
