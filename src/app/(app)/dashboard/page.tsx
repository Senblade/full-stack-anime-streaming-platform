import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Clock3, Eye, MessageSquareText, Plus, Radio, Star, Tv } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { formatHours, timeAgo } from "@/lib/utils";
import { AnimeCover } from "@/components/anime/anime-cover";
import { PartyCard } from "@/components/parties/party-card";
import { ScoreStars } from "@/components/reviews/review-section";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={`${greeting}, ${user.displayName.split(" ")[0]}`}
        title="Your dashboard"
        description="Pick up where you left off, jump into a live room, or find your next obsession."
        actions={
          <>
            <ButtonLink href="/anime" variant="secondary" size="sm">
              Browse catalog
            </ButtonLink>
            <ButtonLink href="/parties/new" size="sm">
              <Plus className="h-4 w-4" /> New watch party
            </ButtonLink>
          </>
        }
      />

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard icon={<Eye className="h-4 w-4" />} label="Watching" value={data.counts.watching ?? 0} tone="text-cyan-300" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={data.counts.completed ?? 0} tone="text-emerald-300" />
        <StatCard icon={<Clock3 className="h-4 w-4" />} label="Time watched" value={formatHours(data.watchedMinutes)} tone="text-violet-300" />
        <StatCard icon={<Tv className="h-4 w-4" />} label="Parties hosted" value={data.hosted} tone="text-pink-300" />
        <StatCard icon={<Radio className="h-4 w-4" />} label="Rooms joined" value={data.joined} tone="text-amber-300" />
        <StatCard icon={<MessageSquareText className="h-4 w-4" />} label="Reviews" value={data.reviews} tone="text-sky-300" />
      </section>

      {/* Live now */}
      <section>
        <SectionHeader
          title={
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse-dot" /> Live right now
            </span>
          }
          description="Rooms you can hop into this second."
          action={
            <Link href="/parties" className="flex items-center gap-1 text-sm text-violet-300 hover:text-violet-200">
              All parties <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        {data.liveParties.length === 0 ? (
          <EmptyState compact icon={<Radio className="h-6 w-6" />} title="Nobody is live yet" description="Be the first — open a room and share the code." action={<ButtonLink href="/parties/new" size="sm">Start a party</ButtonLink>} />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.liveParties.map((p) => (
              <PartyCard key={p.id} party={p} currentUserId={user.id} />
            ))}
          </div>
        )}
      </section>

      {/* Continue watching */}
      <section>
        <SectionHeader title="Continue watching" description="Your in-progress shows, most recent first." action={<Link href="/library" className="flex items-center gap-1 text-sm text-violet-300 hover:text-violet-200">My library <ArrowRight className="h-4 w-4" /></Link>} />
        {data.continueWatching.length === 0 ? (
          <EmptyState compact icon={<Eye className="h-6 w-6" />} title="Nothing in progress" description="Mark something as Watching and it will show up here with your episode progress." action={<ButtonLink href="/anime" size="sm" variant="secondary">Find something to watch</ButtonLink>} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {data.continueWatching.map(({ entry, anime }) => {
              const pct = Math.round((entry.progress / Math.max(1, anime.episodes)) * 100);
              return (
                <Link key={entry.id} href={`/anime/${anime.slug}`} className="group">
                  <AnimeCover anime={anime} className="shadow-card ring-1 ring-white/5 transition group-hover:ring-brand/40" />
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>
                        Ep {entry.progress}/{anime.episodes}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${anime.accentColor}, #ec4899)` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-10 xl:grid-cols-[1fr_380px]">
        {/* Trending */}
        <section>
          <SectionHeader title="Trending this week" description="Most popular across the community." action={<Link href="/anime?sort=popular" className="flex items-center gap-1 text-sm text-violet-300 hover:text-violet-200">See all <ArrowRight className="h-4 w-4" /></Link>} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {data.trending.map((a, i) => (
              <Link key={a.id} href={`/anime/${a.slug}`} className="group relative">
                <AnimeCover anime={a} className="shadow-card ring-1 ring-white/5 transition group-hover:ring-brand/40" />
                <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-[11px] font-bold text-white">{i + 1}</span>
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                  <Star className="h-3 w-3 fill-current" /> {a.rating.toFixed(1)}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Activity */}
        <div className="space-y-10">
          <section>
            <SectionHeader title="Upcoming parties" />
            {data.upcoming.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border-strong p-5 text-center text-sm text-muted">No scheduled parties yet.</p>
            ) : (
              <div className="space-y-3">
                {data.upcoming.map((p) => (
                  <PartyCard key={p.id} party={p} currentUserId={user.id} compact />
                ))}
              </div>
            )}
          </section>
          <section>
            <SectionHeader title="Latest reviews" />
            <div className="space-y-3">
              {data.recentReviews.map((r) => (
                <Link key={r.id} href={`/anime/${r.anime.slug}`} className="flex gap-3 rounded-2xl border border-border bg-surface p-3 transition hover:border-brand/40">
                  <div className="w-10 shrink-0">
                    <AnimeCover anime={r.anime} showTitle={false} rounded="rounded-lg" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Avatar name={r.user.displayName} color={r.user.avatarColor} size="xs" />
                      <span className="truncate text-xs text-muted">
                        {r.user.displayName} · {timeAgo(r.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{r.title}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <ScoreStars value={r.rating} />
                      <span className="truncate text-xs text-muted">{r.anime.title}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone: string }) {
  return (
    <div className="animate-fade-up rounded-2xl border border-border bg-surface p-4">
      <div className={`flex items-center gap-2 text-xs font-medium text-muted`}>
        <span className={tone}>{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}
