import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calendar, Clapperboard, Clock3, Film, Plus, Radio, Star, Tv } from "lucide-react";
import { canManage, requireUser } from "@/lib/auth";
import { getAnimeBySlug, getLibraryEntry, getParties, getRelatedAnime, getReviewsForAnime } from "@/lib/queries";
import { AnimeAdminActions } from "@/components/anime/anime-admin-actions";
import { AnimeBackdrop, AnimeCover } from "@/components/anime/anime-cover";
import { LibraryControls } from "@/components/anime/library-controls";
import { PartyCard } from "@/components/parties/party-card";
import { ReviewSection } from "@/components/reviews/review-section";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const anime = await getAnimeBySlug(slug);
  return { title: anime?.title ?? "Anime" };
}

export default async function AnimeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const anime = await getAnimeBySlug(slug);
  if (!anime) notFound();

  const [entry, reviews, parties, related] = await Promise.all([
    getLibraryEntry(user.id, anime.id),
    getReviewsForAnime(anime.id),
    getParties(user.id, { animeId: anime.id, limit: 6 }),
    getRelatedAnime(anime, 6),
  ]);
  const activeParties = parties.filter((p) => p.status !== "ended");
  const avgReview = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const manage = canManage(user, anime.createdById);

  return (
    <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <AnimeBackdrop anime={anime} />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-8 pt-10 sm:px-6 md:flex-row md:items-end lg:px-8">
          <div className="w-40 shrink-0 sm:w-48">
            <AnimeCover anime={anime} showTitle={false} priority className="shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/10" />
          </div>
          <div className="min-w-0 flex-1 animate-fade-up">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={anime.status === "airing" ? "success" : anime.status === "upcoming" ? "warning" : "neutral"}>
                {anime.status === "airing" ? "Currently airing" : anime.status === "upcoming" ? "Upcoming" : "Finished"}
              </Badge>
              <Badge tone="brand">{anime.type}</Badge>
              {anime.genres.map((g) => (
                <Link key={g} href={`/anime?genre=${encodeURIComponent(g)}`}>
                  <Badge className="hover:border-brand/50 hover:text-fg">{g}</Badge>
                </Link>
              ))}
            </div>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{anime.title}</h1>
            {anime.titleJapanese && <p className="mt-1 text-sm text-muted">{anime.titleJapanese}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              <span className="flex items-center gap-1.5 text-amber-300">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-semibold">{anime.rating.toFixed(1)}</span>
                <span className="text-muted">/ 10</span>
              </span>
              {avgReview != null && (
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-fg">{avgReview.toFixed(1)}</span> community ({reviews.length})
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> {anime.season} {anime.year}
              </span>
              <span className="flex items-center gap-1.5">
                <Film className="h-4 w-4" /> {anime.episodes} {anime.episodes === 1 ? "episode" : "episodes"}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" /> {anime.episodeLength} min
              </span>
              {anime.studio && (
                <span className="flex items-center gap-1.5">
                  <Clapperboard className="h-4 w-4" /> {anime.studio}
                </span>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <ButtonLink href={`/parties/new?anime=${anime.id}`}>
                <Tv className="h-4 w-4" /> Start a watch party
              </ButtonLink>
              {manage && <AnimeAdminActions animeId={anime.id} slug={anime.slug} title={anime.title} />}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-8">
        <div className="space-y-10">
          <section>
            <h2 className="mb-2 text-lg font-semibold">Synopsis</h2>
            <p className="max-w-3xl text-[15px] leading-relaxed text-muted">{anime.synopsis || "No synopsis yet. Know this one? Edit the entry to add one."}</p>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Watch parties</h2>
                <p className="text-sm text-muted">Rooms currently watching this title.</p>
              </div>
              <ButtonLink href={`/parties/new?anime=${anime.id}`} size="sm" variant="secondary">
                <Plus className="h-4 w-4" /> Host one
              </ButtonLink>
            </div>
            {activeParties.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border-strong p-4 text-sm text-muted">
                <Radio className="h-4 w-4 shrink-0 text-violet-300" /> No active rooms for this anime. Start one and invite up to 9 friends.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {activeParties.map((p) => (
                  <PartyCard key={p.id} party={p} currentUserId={user.id} compact />
                ))}
              </div>
            )}
          </section>

          <ReviewSection animeId={anime.id} reviews={reviews} me={{ id: user.id, username: user.username, displayName: user.displayName, avatarColor: user.avatarColor, role: user.role }} />
        </div>

        <aside className="space-y-6">
          <LibraryControls animeId={anime.id} episodes={anime.episodes} entry={entry} accent={anime.accentColor} />
          {related.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold">You might also like</h3>
              <div className="grid grid-cols-3 gap-2">
                {related.map((r) => (
                  <Link key={r.id} href={`/anime/${r.slug}`} className="group">
                    <AnimeCover anime={r} rounded="rounded-xl" className="ring-1 ring-white/5 transition group-hover:ring-brand/40" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
