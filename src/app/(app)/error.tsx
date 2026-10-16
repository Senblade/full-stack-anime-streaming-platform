"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      icon={<AlertTriangle className="h-6 w-6" />}
      title="Something went wrong"
      description={error.message || "An unexpected error occurred while loading this page."}
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
