"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Heart, Minus, Plus, Trash2, BookmarkPlus } from "lucide-react";
import { removeLibraryEntryAction, upsertLibraryEntryAction, type LibraryPatch } from "@/actions/library";
import type { LibraryEntry } from "@/db/schema";
import { LIBRARY_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type EntryState = Pick<LibraryEntry, "status" | "progress" | "score" | "favorite" | "notes"> | null;

export function LibraryControls({ animeId, episodes, entry, accent }: { animeId: number; episodes: number; entry: EntryState; accent: string }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [optimistic, applyOptimistic] = useOptimistic<EntryState, LibraryPatch | null>(entry, (state, patch) => {
    if (patch === null) return null;
    const base = state ?? { status: "plan_to_watch", progress: 0, score: null, favorite: false, notes: "" };
    const next = { ...base, ...patch, score: patch.score === undefined ? base.score : patch.score };
    if (patch.status === "completed") next.progress = episodes;
    if (next.progress >= episodes && next.status === "watching") next.status = "completed";
    return next;
  });
  const [notes, setNotes] = useState(entry?.notes ?? "");

  const run = (patch: LibraryPatch, successMsg?: string) => {
    startTransition(async () => {
      applyOptimistic(patch);
      const res = await upsertLibraryEntryAction(animeId, patch);
      if (!res.ok) toast({ tone: "error", title: res.error ?? "Something went wrong" });
      else if (successMsg) toast({ tone: "success", title: successMsg });
    });
  };

  const remove = () => {
    startTransition(async () => {
      applyOptimistic(null);
      const res = await removeLibraryEntryAction(animeId);
      if (!res.ok) toast({ tone: "error", title: "Could not remove entry" });
      else toast({ tone: "info", title: "Removed from your library" });
    });
  };

  if (!optimistic) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold">Track this anime</h3>
        <p className="mt-1 text-xs text-muted">Add it to your library to track progress, score it, and keep notes.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={() => run({ status: "watching", progress: 0 }, "Started watching!")} loading={pending}>
            <Plus className="h-4 w-4" /> Start watching
          </Button>
          <Button variant="secondary" onClick={() => run({ status: "plan_to_watch" }, "Added to Plan to Watch")} disabled={pending}>
            <BookmarkPlus className="h-4 w-4" /> Plan to watch
          </Button>
        </div>
      </div>
    );
  }

  const pct = episodes > 0 ? Math.min(100, Math.round((optimistic.progress / episodes) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">In your library</h3>
        <button
          onClick={() => run({ favorite: !optimistic.favorite }, optimistic.favorite ? undefined : "Added to favourites")}
          className={cn("flex h-8 w-8 items-center justify-center rounded-lg border transition", optimistic.favorite ? "border-pink-400/40 bg-pink-500/15 text-pink-300" : "border-border text-muted hover:text-pink-300")}
          aria-label="Toggle favourite"
        >
          <Heart className={cn("h-4 w-4", optimistic.favorite && "fill-current")} />
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">Status</label>
          <Select value={optimistic.status} onChange={(e) => run({ status: e.target.value })} disabled={pending}>
            {LIBRARY_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium uppercase tracking-wide text-muted">Progress</span>
            <span className="tabular-nums text-muted">
              {optimistic.progress} / {episodes} ep
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" onClick={() => run({ progress: optimistic.progress - 1 })} disabled={pending || optimistic.progress <= 0} aria-label="Decrease progress">
              <Minus className="h-4 w-4" />
            </Button>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, #ec4899)` }} />
            </div>
            <Button variant="secondary" size="icon" onClick={() => run({ progress: optimistic.progress + 1, status: optimistic.status === "plan_to_watch" ? "watching" : undefined })} disabled={pending || optimistic.progress >= episodes} aria-label="Increase progress">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">Your score</label>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => run({ score: optimistic.score === n ? null : n })}
                disabled={pending}
                className={cn(
                  "h-8 rounded-lg border text-xs font-semibold transition",
                  optimistic.score != null && n <= optimistic.score ? "border-amber-400/50 bg-amber-400/20 text-amber-200" : "border-border bg-surface-2 text-muted hover:border-amber-400/40 hover:text-amber-200",
                )}
                aria-label={`Score ${n}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Private notes — where you stopped, thoughts, who recommended it…" className="min-h-[72px]" />
          {notes !== (optimistic.notes ?? "") && (
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => run({ notes }, "Notes saved")} loading={pending}>
                Save notes
              </Button>
            </div>
          )}
        </div>

        <button onClick={remove} disabled={pending} className="inline-flex items-center justify-center gap-1.5 text-xs text-muted transition hover:text-danger">
          <Trash2 className="h-3.5 w-3.5" /> Remove from library
        </button>
      </div>
    </div>
  );
}
