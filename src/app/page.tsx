import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MessageSquareHeart, Play, Radio, Star, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { getLandingHighlights } from "@/lib/queries";
import { AnimeCover } from "@/components/anime/anime-cover";
import { Logo } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { trending, totals } = await getLandingHighlights().catch(() => ({ trending: [], totals: { anime: 0, parties: 0, users: 0 } }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[720px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero.jpg" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/30 via-bg/70 to-bg" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="text-lg font-bold">{APP_NAME}</span>
        </Link>
        <nav className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Sign in
          </ButtonLink>
          <ButtonLink href="/register" size="sm">
            Get started
          </ButtonLink>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6">
        <section className="pb-16 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs font-medium text-violet-200">
            <Radio className="h-3.5 w-3.5" /> Synced watch parties for up to 10 friends
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Your anime life, <span className="text-gradient">in sync</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/70 sm:text-lg">
            Track {totals.anime.toLocaleString()}+ titles, write reviews your friends actually read, and press play together from anywhere.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/register" size="lg">
              Create free account <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/login" size="lg" variant="secondary">
              <Play className="h-4 w-4" /> Try the demo
            </ButtonLink>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-sm text-white/60">
            <Stat value={`${totals.anime}+`} label="anime catalogued" />
            <Stat value={`${totals.parties}`} label="watch parties hosted" />
            <Stat value="10" label="seats per room" />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Feature icon={<Users className="h-5 w-5" />} title="Watch together" text="Host rooms for up to 10 people. The host presses play, everyone's player follows — with live chat and reactions." />
          <Feature icon={<Star className="h-5 w-5" />} title="Track everything" text="Watching, completed, on hold, dropped. Episode progress, scores, favourites and private notes." />
          <Feature icon={<MessageSquareHeart className="h-5 w-5" />} title="Reviews that matter" text="Spoiler-tagged reviews from people you watch with, right on every title page." />
        </section>

        <section className="py-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">Trending now</p>
              <h2 className="mt-1 text-2xl font-bold">What everyone&apos;s watching</h2>
            </div>
            <ButtonLink href="/login" variant="ghost" size="sm">
              Browse all <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {trending.map((a) => (
              <Link key={a.id} href="/login" className="group">
                <AnimeCover anime={a} className="shadow-card ring-1 ring-white/5 transition group-hover:ring-brand/40" />
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border py-8 text-center text-xs text-muted">
        {APP_NAME} · Built for anime fans. Demo streams use royalty-free footage.
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-6 backdrop-blur">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand/30 to-brand-2/30 text-violet-200 ring-1 ring-brand/30">{icon}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted">{text}</p>
    </div>
  );
}
