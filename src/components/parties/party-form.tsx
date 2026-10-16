"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Lock, Search, Users } from "lucide-react";
import { createPartyAction, type PartyFormState } from "@/actions/parties";
import { MAX_PARTY_SIZE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AnimeCover } from "@/components/anime/anime-cover";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/input";

export type AnimeOption = { id: number; title: string; episodes: number; artKey: string; hueShift: number; year: number; type: string };

export function PartyForm({ options, initialAnimeId }: { options: AnimeOption[]; initialAnimeId?: number }) {
  const [state, formAction, pending] = useActionState<PartyFormState, FormData>(createPartyAction, null);
  const [query, setQuery] = useState("");
  const [animeId, setAnimeId] = useState<number | null>(initialAnimeId ?? null);
  const [episode, setEpisode] = useState(1);
  const [size, setSize] = useState(MAX_PARTY_SIZE);
  const [startMode, setStartMode] = useState<"now" | "later">("now");

  const selected = options.find((o) => o.id === animeId) ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => o.title.toLowerCase().includes(q)) : options;
    return list.slice(0, 12);
  }, [options, query]);

  const defaultSchedule = useMemo(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {/* Step 1: pick anime */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">1. What are we watching?</h2>
              <p className="text-xs text-muted">Pick a title from the catalog.</p>
            </div>
            {selected && (
              <span className="flex items-center gap-1 text-xs text-emerald-300">
                <Check className="h-3.5 w-3.5" /> {selected.title}
              </span>
            )}
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the catalog…" className="pl-9" />
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setAnimeId(o.id);
                  setEpisode(1);
                }}
                className={cn("group relative rounded-xl text-left ring-2 ring-offset-2 ring-offset-surface transition", animeId === o.id ? "ring-brand" : "ring-transparent hover:ring-border-strong")}
              >
                <AnimeCover anime={o} rounded="rounded-xl" />
                {animeId === o.id && (
                  <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            ))}
            {filtered.length === 0 && <p className="col-span-full py-6 text-center text-sm text-muted">No titles match “{query}”.</p>}
          </div>
          <input type="hidden" name="animeId" value={animeId ?? ""} />
        </section>

        {/* Step 2: details */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-semibold">2. Party details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Party name" className="sm:col-span-2">
              <Input name="name" placeholder={selected ? `${selected.title} night` : "Friday anime night"} required minLength={3} />
            </Field>
            <Field label="Description" hint="optional" className="sm:col-span-2">
              <Textarea name="description" placeholder="House rules, where you're starting from, snacks policy…" className="min-h-[72px]" />
            </Field>
            <Field label="Episode" hint={selected ? `of ${selected.episodes}` : undefined}>
              <Input name="episode" type="number" min={1} max={selected?.episodes ?? 9999} value={episode} onChange={(e) => setEpisode(Number(e.target.value))} required />
            </Field>
            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted">
                <span>Room size</span>
                <span className="flex items-center gap-1 normal-case tracking-normal">
                  <Users className="h-3.5 w-3.5" /> {size} people
                </span>
              </label>
              <input type="range" name="maxParticipants" min={2} max={MAX_PARTY_SIZE} value={size} onChange={(e) => setSize(Number(e.target.value))} className="mt-2 w-full" />
              <div className="mt-1 flex justify-between text-[10px] text-muted">
                <span>2</span>
                <span>Max {MAX_PARTY_SIZE}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: timing */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-semibold">3. When?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={cn("cursor-pointer rounded-xl border p-4 transition", startMode === "now" ? "border-brand/60 bg-brand/10" : "border-border hover:border-border-strong")}>
              <input type="radio" name="startMode" value="now" checked={startMode === "now"} onChange={() => setStartMode("now")} className="sr-only" />
              <p className="text-sm font-semibold">Start now</p>
              <p className="text-xs text-muted">Room goes live immediately.</p>
            </label>
            <label className={cn("cursor-pointer rounded-xl border p-4 transition", startMode === "later" ? "border-brand/60 bg-brand/10" : "border-border hover:border-border-strong")}>
              <input type="radio" name="startMode" value="later" checked={startMode === "later"} onChange={() => setStartMode("later")} className="sr-only" />
              <p className="text-sm font-semibold">Schedule for later</p>
              <p className="text-xs text-muted">People can RSVP in the lobby.</p>
            </label>
          </div>
          {startMode === "later" && (
            <Field label="Date & time" className="mt-4 animate-fade-in">
              <Input name="scheduledFor" type="datetime-local" defaultValue={defaultSchedule} required />
            </Field>
          )}
          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-sm">
            <input type="checkbox" name="isPrivate" className="h-4 w-4 accent-violet-500" />
            <Lock className="h-4 w-4 text-muted" />
            <span>
              <span className="font-medium">Private room</span>
              <span className="block text-xs text-muted">Hidden from the public list — only people with the code can join.</span>
            </span>
          </label>
        </section>

        <FormError message={state?.error} />
      </div>

      {/* Summary */}
      <aside className="h-fit space-y-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-24">
        <h3 className="text-sm font-semibold">Summary</h3>
        {selected ? (
          <div className="flex gap-3">
            <div className="w-16 shrink-0">
              <AnimeCover anime={selected} showTitle={false} rounded="rounded-lg" />
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold">{selected.title}</p>
              <p className="text-xs text-muted">
                {selected.type} · {selected.year}
              </p>
              <p className="mt-1 text-xs text-muted">
                Episode {episode} of {selected.episodes}
              </p>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border-strong p-4 text-center text-xs text-muted">Pick an anime to continue.</p>
        )}
        <ul className="space-y-1.5 text-xs text-muted">
          <li className="flex justify-between">
            <span>Seats</span>
            <span className="text-fg">{size}</span>
          </li>
          <li className="flex justify-between">
            <span>Starts</span>
            <span className="text-fg">{startMode === "now" ? "Immediately" : "Scheduled"}</span>
          </li>
        </ul>
        <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!selected}>
          {startMode === "now" ? "Open the room" : "Schedule party"}
        </Button>
        <Link href="/parties" className={buttonVariants({ variant: "ghost", className: "w-full" })}>
          Cancel
        </Link>
      </aside>
    </form>
  );
}
