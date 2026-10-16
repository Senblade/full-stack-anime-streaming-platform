import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger" | "pink";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-3 text-muted border-border",
  brand: "bg-brand/15 text-violet-300 border-brand/30",
  accent: "bg-accent/15 text-cyan-300 border-accent/30",
  success: "bg-success/15 text-emerald-300 border-success/30",
  warning: "bg-warning/15 text-amber-300 border-warning/30",
  danger: "bg-danger/15 text-red-300 border-danger/30",
  pink: "bg-brand-2/15 text-pink-300 border-brand-2/30",
};

export function Badge({ tone = "neutral", className, children, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4", tones[tone], className)} {...props}>
      {children}
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full bg-success animate-pulse-dot", className)} />;
}

export function libraryTone(status: string | null | undefined): Tone {
  switch (status) {
    case "watching":
      return "accent";
    case "completed":
      return "success";
    case "plan_to_watch":
      return "brand";
    case "on_hold":
      return "warning";
    case "dropped":
      return "danger";
    default:
      return "neutral";
  }
}

export function partyTone(status: string): Tone {
  if (status === "live") return "success";
  if (status === "scheduled") return "warning";
  return "neutral";
}
