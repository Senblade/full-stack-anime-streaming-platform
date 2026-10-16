"use client";

import Link from "next/link";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Heart, Library, Minus, Plus, Star, Trash2 } from "lucide-react";
import { removeLibraryEntryAction, upsertLibraryEntryAction, type LibraryPatch } from "@/actions/library";
import type { LibraryRow } from "@/lib/queries";
import { LIBRARY_STATUSES } from "@/lib/constants";
import { cn, libraryStatusLabel, timeAgo } from "@/lib/utils";
import { AnimeCover } from "@/components/anime/anime-cover";
import { Badge, libraryTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type Action = { type: "patch"; animeId: number; patch: LibraryPatch } | { type: "remove"; animeId: number };

export function LibraryView({ rows }: { rows: LibraryRow[] }) {
  const [tab, setTab] = useState<string>("all");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const [optimisticRows, apply] = useOptimistic<LibraryRow[], Action>(rows, (state, action) => {
    if (action.type === "remove") return state.filter((r) => r.anime.id !== action.animeId);
    return state.map((r) => {
      if (r.anime.id !== action.animeId) return r;
      const entry = { ...r.entry, ...action.patch, score: action.patch.score === undefined ? r.entry.score : action.patch.score, updatedAt: new Date() };
      if (action.patch.status === "completed") entry.progress = r.anime.episodes;
      if (entry.progress >= r.anime.episodes && entry.status === "watching") entry.status = "completed";
      return { ...r, entry };
    });
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: optimisticRows.length };
    for (const r of optimisticRows) c[r.entry.status] = (c[r.entry.status] ?? 0) + 1;
    return c;
  }, [optimisticRows]);

  const visible = tab === "all" ? optimisticRows : optimisticRows.filter((r) => r.entry.status === tab);

  const patch = (animeId: number, p: LibraryPatch) =>
    startTransition(async () => {
      apply({ type: "patch", animeId, patch: p });
      const res = await upsertLibraryEntryAction(animeId, p);
      if (!res.ok) toast({ tone: "error", title: res.error ?? "Update failed" });
    });

  const remove = (animeId: number, title: string) =>
    startTransition(async () => {
      apply({ type: "remove", animeId });
      const res = await removeLibraryEntryAction(animeId);
      if (!res.ok) toast({ tone: "error", title: "Could not remove" });
      else toast({ tone: "info", title: `Removed ${title}` });
    });

  return (
    <div>
      <div className="no-scrollbar -mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1">
        <Tab active={tab === "all"} onClick={() => setTab("all")} label="All" count={counts.all ?? 0} />
        {LIBRARY_STATUSES.map((s) => (
          <Tab key={s.value} active={tab === s.value} onClick={() => setTab(s.value)} label={s.label} count={counts[s.value] ?? 0} color={s.color} />
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Library className="h-6 w-6" />}
          title={tab === "all" ? "Your library is empty" : `Nothing in ${libraryStatusLabel(tab)}`}
          description={tab === "all" ? "Add anime from the catalog to track episodes, scores, and favourites." : "Change a title's status and it will appear here."}
          action={
            <ButtonLink href="/anime" size="sm">
              Browse the catalog
            </ButtonLink>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {visible.map(({ entry, anime }) => {
            const pct = Math.round((entry.progress / Math.max(1, anime.episodes)) * 100);
            return (
              <div key={entry.id} className={cn("group flex animate-fade-up gap-4 rounded-2xl border border-border bg-surface p-3 transition hover:border-border-strong sm:p-4", pending && "opacity-90")}>
                <Link href={`/anime/${anime.slug}`} className="w-16 shrink-0 sm:w-20">
                  <AnimeCover anime={anime} showTitle={false} rounded="rounded-xl" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/anime/${anime.slug}`} className="line-clamp-1 text-sm font-semibold hover:text-violet-200 sm:text-base">
                        {anime.title}
                      </Link>
                      <p className="text-xs text-muted" suppressHydrationWarning>
                        {anime.type} · {anime.year} · {anime.studio || "Unknown studio"} · updated {timeAgo(entry.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {entry.favorite && (
                        <Badge tone="pink">
                          <Heart className="h-3 w-3 fill-current" /> Favourite
                        </Badge>
                      )}
                      <Badge tone={libraryTone(entry.status)}>{libraryStatusLabel(entry.status)}</Badge>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-2">
                      <button onClick={() => patch(anime.id, { progress: entry.progress - 1 })} disabled={entry.progress <= 0} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted hover:text-fg disabled:opacity-30" aria-label="Decrease progress">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <div className="flex-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${anime.accentColor}, #ec4899)` }} />
                        </div>
                      </div>
                      <button onClick={() => patch(anime.id, { progress: entry.progress + 1, status: entry.status === "plan_to_watch" ? "watching" : undefined })} disabled={entry.progress >= anime.episodes} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted hover:text-fg disabled:opacity-30" aria-label="Increase progress">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-20 text-right text-xs tabular-nums text-muted">
                        {entry.progress}/{anime.episodes} ep
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={entry.status} onChange={(e) => patch(anime.id, { status: e.target.value })} className="h-8 w-[150px] text-xs">
                        {LIBRARY_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                      <Select value={entry.score ?? ""} onChange={(e) => patch(anime.id, { score: e.target.value ? Number(e.target.value) : null })} className="h-8 w-[88px] text-xs" aria-label="Score">
                        <option value="">Score</option>
                        {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => (
                          <option key={n} value={n}>
                            {n} ★
                          </option>
                        ))}
                      </Select>
                      <button onClick={() => patch(anime.id, { favorite: !entry.favorite })} className={cn("flex h-8 w-8 items-center justify-center rounded-lg border transition", entry.favorite ? "border-pink-400/40 bg-pink-500/15 text-pink-300" : "border-border text-muted hover:text-pink-300")} aria-label="Toggle favourite">
                        <Heart className={cn("h-3.5 w-3.5", entry.favorite && "fill-current")} />
                      </button>
                      <button onClick={() => remove(anime.id, anime.title)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger" aria-label="Remove from library">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {entry.score != null && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-amber-300">
                      <Star className="h-3 w-3 fill-current" /> You scored it {entry.score}/10
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tab({ active, onClick, label, count, color }: { active: boolean; onClick: () => void; label: string; count: number; color?: string }) {
  return (
    <button onClick={onClick} className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition", active ? "border-brand/60 bg-brand/15 text-violet-100" : "border-border bg-surface-2/60 text-muted hover:text-fg")}>
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {label}
      <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", active ? "bg-brand/30" : "bg-surface-3")}>{count}</span>
    </button>
  );
}
