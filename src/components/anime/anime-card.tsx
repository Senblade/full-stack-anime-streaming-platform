"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Check, Plus, Star } from "lucide-react";
import { upsertLibraryEntryAction, removeLibraryEntryAction } from "@/actions/library";
import type { AnimeWithLibrary } from "@/lib/queries";
import { cn, libraryStatusLabel } from "@/lib/utils";
import { AnimeCover } from "@/components/anime/anime-cover";
import { Badge, libraryTone } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

export function AnimeCard({ anime, priority }: { anime: AnimeWithLibrary; priority?: boolean }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<string | null, string | null>(anime.libraryStatus, (_, next) => next);
  const inLibrary = Boolean(optimisticStatus);

  const toggle = () => {
    startTransition(async () => {
      if (inLibrary) {
        setOptimisticStatus(null);
        const res = await removeLibraryEntryAction(anime.id);
        if (!res.ok) toast({ tone: "error", title: "Could not update library" });
        else toast({ tone: "info", title: `Removed ${anime.title} from your library` });
      } else {
        setOptimisticStatus("plan_to_watch");
        const res = await upsertLibraryEntryAction(anime.id, { status: "plan_to_watch" });
        if (!res.ok) toast({ tone: "error", title: res.error ?? "Could not update library" });
        else toast({ tone: "success", title: "Added to Plan to Watch", description: anime.title });
      }
    });
  };

  return (
    <div className="group relative animate-fade-up">
      <Link href={`/anime/${anime.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 rounded-2xl">
        <div className="relative">
          <AnimeCover anime={anime} priority={priority} className="shadow-card ring-1 ring-white/5 transition-shadow group-hover:ring-brand/40" />
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {optimisticStatus && (
              <Badge tone={libraryTone(optimisticStatus)} className="backdrop-blur">
                {libraryStatusLabel(optimisticStatus)}
              </Badge>
            )}
            {anime.status === "airing" && (
              <Badge tone="success" className="backdrop-blur">
                Airing
              </Badge>
            )}
            {anime.status === "upcoming" && (
              <Badge tone="warning" className="backdrop-blur">
                Upcoming
              </Badge>
            )}
          </div>
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-amber-300 backdrop-blur">
            <Star className="h-3 w-3 fill-current" /> {anime.rating.toFixed(1)}
          </div>
        </div>
      </Link>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/anime/${anime.slug}`} className="line-clamp-1 text-sm font-semibold hover:text-violet-200">
            {anime.title}
          </Link>
          <p className="truncate text-xs text-muted">
            {anime.type} · {anime.year} · {anime.episodes} ep
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={pending}
          aria-label={inLibrary ? "Remove from library" : "Add to library"}
          title={inLibrary ? "Remove from library" : "Add to Plan to Watch"}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition",
            inLibrary ? "border-success/40 bg-success/15 text-emerald-300 hover:bg-danger/15 hover:text-danger hover:border-danger/40" : "border-border bg-surface-2 text-muted hover:border-brand/50 hover:text-violet-200",
            pending && "opacity-60",
          )}
        >
          {inLibrary ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

export function AnimeGrid({ items }: { items: AnimeWithLibrary[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((a, i) => (
        <AnimeCard key={a.id} anime={a} priority={i < 6} />
      ))}
    </div>
  );
}
