"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createAnimeAction, updateAnimeAction, type AnimeFormState } from "@/actions/anime";
import type { Anime } from "@/db/schema";
import { ANIME_STATUSES, ANIME_TYPES, ART_KEYS, GENRES, SEASONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AnimeCover } from "@/components/anime/anime-cover";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/input";

const ACCENTS = ["#8b5cf6", "#ec4899", "#f97316", "#22d3ee", "#34d399", "#fbbf24", "#f43f5e", "#3b82f6", "#a3e635", "#c084fc"];

export function AnimeForm({ anime }: { anime?: Anime }) {
  const action = anime ? updateAnimeAction.bind(null, anime.id) : createAnimeAction;
  const [state, formAction, pending] = useActionState<AnimeFormState, FormData>(action, null);

  const [title, setTitle] = useState(anime?.title ?? "");
  const [titleJapanese, setTitleJapanese] = useState(anime?.titleJapanese ?? "");
  const [artKey, setArtKey] = useState(anime?.artKey ?? "fantasy");
  const [hueShift, setHueShift] = useState(anime?.hueShift ?? 0);
  const [accentColor, setAccentColor] = useState(anime?.accentColor ?? "#8b5cf6");
  const [genres, setGenres] = useState<string[]>(anime?.genres ?? []);

  const toggleGenre = (g: string) => setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[280px_1fr]">
      {/* Preview */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Cover preview</p>
        <AnimeCover anime={{ title: title || "Untitled", titleJapanese, artKey, hueShift, accentColor }} className="shadow-card" />
        <div className="mt-4">
          <label className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted">
            <span>Art style</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {ART_KEYS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setArtKey(k.value)}
                title={k.label}
                className={cn("relative aspect-[2/3] overflow-hidden rounded-lg ring-2 transition", artKey === k.value ? "ring-brand" : "ring-transparent hover:ring-border-strong")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/covers/${k.value}.jpg`} alt={k.label} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <input type="hidden" name="artKey" value={artKey} />
        </div>
        <div className="mt-4">
          <label className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted">
            <span>Hue</span>
            <span>{hueShift}°</span>
          </label>
          <input type="range" name="hueShift" min={0} max={359} value={hueShift} onChange={(e) => setHueShift(Number(e.target.value))} className="w-full" />
        </div>
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Accent colour</p>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((c) => (
              <button key={c} type="button" onClick={() => setAccentColor(c)} className={cn("h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-surface transition", accentColor === c ? "ring-white" : "ring-transparent")} style={{ background: c }} aria-label={c} />
            ))}
          </div>
          <input type="hidden" name="accentColor" value={accentColor} />
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-semibold">Basics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" className="sm:col-span-2">
              <Input name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Frieren: Beyond Journey's End" required />
            </Field>
            <Field label="Japanese title" hint="optional" className="sm:col-span-2">
              <Input name="titleJapanese" value={titleJapanese} onChange={(e) => setTitleJapanese(e.target.value)} placeholder="葬送のフリーレン" />
            </Field>
            <Field label="Synopsis" className="sm:col-span-2">
              <Textarea name="synopsis" defaultValue={anime?.synopsis ?? ""} placeholder="What's it about? Keep it spoiler-free." className="min-h-[120px]" />
            </Field>
            <Field label="Studio">
              <Input name="studio" defaultValue={anime?.studio ?? ""} placeholder="Madhouse" />
            </Field>
            <Field label="Type">
              <Select name="type" defaultValue={anime?.type ?? "TV"}>
                {ANIME_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-semibold">Release & length</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Status">
              <Select name="status" defaultValue={anime?.status ?? "finished"}>
                {ANIME_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Year">
              <Input name="year" type="number" min={1917} max={2100} defaultValue={anime?.year ?? new Date().getFullYear()} required />
            </Field>
            <Field label="Season">
              <Select name="season" defaultValue={anime?.season ?? "Spring"}>
                {SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Rating" hint="0–10">
              <Input name="rating" type="number" step="0.1" min={0} max={10} defaultValue={anime?.rating ?? 7.5} required />
            </Field>
            <Field label="Episodes">
              <Input name="episodes" type="number" min={1} max={5000} defaultValue={anime?.episodes ?? 12} required />
            </Field>
            <Field label="Episode length" hint="minutes">
              <Input name="episodeLength" type="number" min={1} max={300} defaultValue={anime?.episodeLength ?? 24} required />
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-1 text-sm font-semibold">Genres</h2>
          <p className="mb-4 text-xs text-muted">Pick everything that applies. {genres.length} selected.</p>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenre(g)}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium transition", genres.includes(g) ? "border-brand/60 bg-brand/20 text-violet-200" : "border-border bg-surface-2 text-muted hover:text-fg")}
              >
                {g}
              </button>
            ))}
          </div>
          {genres.map((g) => (
            <input key={g} type="hidden" name="genres" value={g} />
          ))}
        </div>

        <FormError message={state?.error} />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href={anime ? `/anime/${anime.slug}` : "/anime"} className={buttonVariants({ variant: "ghost" })}>
            Cancel
          </Link>
          <Button type="submit" loading={pending} size="lg">
            {anime ? "Save changes" : "Add to catalog"}
          </Button>
        </div>
      </div>
    </form>
  );
}
