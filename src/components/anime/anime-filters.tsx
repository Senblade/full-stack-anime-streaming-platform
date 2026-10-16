"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { ANIME_STATUSES, ANIME_TYPES, GENRES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/input";

export function AnimeFilters({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const current = {
    q: params.get("q") ?? "",
    genre: params.get("genre") ?? "",
    status: params.get("status") ?? "",
    type: params.get("type") ?? "",
    sort: params.get("sort") ?? "popular",
  };

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  };

  const hasFilters = current.q || current.genre || current.status || current.type;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <SlidersHorizontal className="h-4 w-4" />
          <span className={cn("tabular-nums", pending && "opacity-50")}>{total.toLocaleString()} titles</span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={current.status} onChange={(e) => update({ status: e.target.value })} className="h-9 w-auto min-w-[150px] text-xs">
            <option value="">Any status</option>
            {ANIME_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select value={current.type} onChange={(e) => update({ type: e.target.value })} className="h-9 w-auto min-w-[120px] text-xs">
            <option value="">Any type</option>
            {ANIME_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select value={current.sort} onChange={(e) => update({ sort: e.target.value })} className="h-9 w-auto min-w-[150px] text-xs">
            <option value="popular">Most popular</option>
            <option value="rating">Top rated</option>
            <option value="year">Newest releases</option>
            <option value="newest">Recently added</option>
            <option value="title">Title A–Z</option>
          </Select>
          {hasFilters && (
            <button onClick={() => update({ q: "", genre: "", status: "", type: "" })} className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-xs text-muted hover:text-fg">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <GenreChip active={!current.genre} onClick={() => update({ genre: "" })}>
          All
        </GenreChip>
        {GENRES.map((g) => (
          <GenreChip key={g} active={current.genre === g} onClick={() => update({ genre: current.genre === g ? "" : g })}>
            {g}
          </GenreChip>
        ))}
      </div>
      {current.q && (
        <p className="text-sm text-muted">
          Showing results for <span className="font-medium text-fg">“{current.q}”</span>
        </p>
      )}
    </div>
  );
}

function GenreChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition",
        active ? "border-brand/60 bg-brand/20 text-violet-200" : "border-border bg-surface-2/60 text-muted hover:border-border-strong hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
