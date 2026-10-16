"use client";

import { useActionState } from "react";
import { ArrowRight, Ticket } from "lucide-react";
import { joinByCodeAction, type PartyFormState } from "@/actions/parties";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/input";

export function JoinByCode({ compact }: { compact?: boolean }) {
  const [state, formAction, pending] = useActionState<PartyFormState, FormData>(joinByCodeAction, null);
  return (
    <form action={formAction} className={compact ? "space-y-2" : "space-y-3 rounded-2xl border border-border bg-surface p-5"}>
      {!compact && (
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-violet-300" />
          <h3 className="text-sm font-semibold">Have a room code?</h3>
        </div>
      )}
      <div className="flex gap-2">
        <input
          name="code"
          placeholder="ABC123"
          maxLength={8}
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface-2/70 px-3.5 font-mono text-sm uppercase tracking-[0.25em] placeholder:tracking-[0.25em] placeholder:text-muted/60 focus:border-brand/70 focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <Button type="submit" variant="secondary" loading={pending}>
          Join <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <FormError message={state?.error} />
    </form>
  );
}
