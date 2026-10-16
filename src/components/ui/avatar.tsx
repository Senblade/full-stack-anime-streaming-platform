import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  color,
  size = "md",
  className,
  ring,
}: {
  name: string;
  color: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  ring?: boolean;
}) {
  const sizes = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
    xl: "h-20 w-20 text-2xl",
  };
  return (
    <div
      className={cn("flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white", sizes[size], ring && "ring-2 ring-bg", className)}
      style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)`, boxShadow: `0 4px 14px -4px ${color}99` }}
      title={name}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}

export function AvatarStack({ people, max = 4, size = "sm" }: { people: { name: string; color: string }[]; max?: number; size?: "xs" | "sm" }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((p, i) => (
        <Avatar key={`${p.name}-${i}`} name={p.name} color={p.color} size={size} ring />
      ))}
      {rest > 0 && (
        <div className={cn("flex items-center justify-center rounded-full bg-surface-3 font-medium text-muted ring-2 ring-bg", size === "xs" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs")}>+{rest}</div>
      )}
    </div>
  );
}
