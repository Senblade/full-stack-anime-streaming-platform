"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { anime } from "@/db/schema";
import { canManage, requireUser } from "@/lib/auth";
import { ANIME_TYPES, ART_KEYS, GENRES, SEASONS } from "@/lib/constants";
import { slugify } from "@/lib/utils";

export type AnimeFormState = { error?: string } | null;

function parseAnimeForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const titleJapanese = String(formData.get("titleJapanese") ?? "").trim();
  const synopsis = String(formData.get("synopsis") ?? "").trim();
  const type = String(formData.get("type") ?? "TV");
  const episodes = Number(formData.get("episodes") ?? 12);
  const episodeLength = Number(formData.get("episodeLength") ?? 24);
  const status = String(formData.get("status") ?? "finished");
  const year = Number(formData.get("year") ?? new Date().getFullYear());
  const season = String(formData.get("season") ?? "Spring");
  const studio = String(formData.get("studio") ?? "").trim();
  const rating = Number(formData.get("rating") ?? 7.5);
  const genres = formData.getAll("genres").map(String).filter((g) => (GENRES as readonly string[]).includes(g));
  const artKey = String(formData.get("artKey") ?? "fantasy");
  const hueShift = Number(formData.get("hueShift") ?? 0);
  const accentColor = String(formData.get("accentColor") ?? "#8b5cf6");

  if (title.length < 1) return { error: "Title is required." } as const;
  if (!(ANIME_TYPES as readonly string[]).includes(type)) return { error: "Invalid type." } as const;
  if (!Number.isFinite(episodes) || episodes < 1 || episodes > 5000) return { error: "Episodes must be between 1 and 5000." } as const;
  if (!Number.isFinite(episodeLength) || episodeLength < 1 || episodeLength > 300) return { error: "Episode length must be between 1 and 300 minutes." } as const;
  if (!["airing", "finished", "upcoming"].includes(status)) return { error: "Invalid status." } as const;
  if (!Number.isFinite(year) || year < 1917 || year > 2100) return { error: "Please enter a valid year." } as const;
  if (!(SEASONS as readonly string[]).includes(season)) return { error: "Invalid season." } as const;
  if (!Number.isFinite(rating) || rating < 0 || rating > 10) return { error: "Rating must be between 0 and 10." } as const;
  if (genres.length === 0) return { error: "Pick at least one genre." } as const;
  if (!ART_KEYS.some((k) => k.value === artKey)) return { error: "Invalid art style." } as const;
  if (!/^#[0-9a-fA-F]{6}$/.test(accentColor)) return { error: "Accent colour must be a hex value." } as const;

  return {
    data: {
      title,
      titleJapanese,
      synopsis,
      type,
      episodes: Math.round(episodes),
      episodeLength: Math.round(episodeLength),
      status,
      year: Math.round(year),
      season,
      studio,
      rating: Math.round(rating * 10) / 10,
      genres,
      artKey,
      hueShift: ((Math.round(hueShift) % 360) + 360) % 360,
      accentColor,
    },
  } as const;
}

async function uniqueSlug(title: string, excludeId?: number) {
  const base = slugify(title) || "anime";
  let slug = base;
  let n = 2;
  for (;;) {
    const where = excludeId ? and(eq(anime.slug, slug), ne(anime.id, excludeId)) : eq(anime.slug, slug);
    const [existing] = await db.select({ id: anime.id }).from(anime).where(where).limit(1);
    if (!existing) return slug;
    slug = `${base}-${n++}`;
  }
}

export async function createAnimeAction(_prev: AnimeFormState, formData: FormData): Promise<AnimeFormState> {
  const user = await requireUser();
  const parsed = parseAnimeForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const slug = await uniqueSlug(parsed.data.title);
  await db.insert(anime).values({ ...parsed.data, slug, createdById: user.id, popularity: 40 });
  revalidatePath("/anime");
  revalidatePath("/dashboard");
  redirect(`/anime/${slug}`);
}

export async function updateAnimeAction(id: number, _prev: AnimeFormState, formData: FormData): Promise<AnimeFormState> {
  const user = await requireUser();
  const [existing] = await db.select().from(anime).where(eq(anime.id, id)).limit(1);
  if (!existing) return { error: "Anime not found." };
  if (!canManage(user, existing.createdById)) return { error: "You can only edit entries you added." };

  const parsed = parseAnimeForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const slug = existing.title === parsed.data.title ? existing.slug : await uniqueSlug(parsed.data.title, id);
  await db
    .update(anime)
    .set({ ...parsed.data, slug, updatedAt: new Date() })
    .where(eq(anime.id, id));
  revalidatePath("/anime");
  revalidatePath(`/anime/${slug}`);
  redirect(`/anime/${slug}`);
}

export async function deleteAnimeAction(id: number) {
  const user = await requireUser();
  const [existing] = await db.select().from(anime).where(eq(anime.id, id)).limit(1);
  if (!existing) return { error: "Anime not found." };
  if (!canManage(user, existing.createdById)) return { error: "You can only delete entries you added." };
  await db.delete(anime).where(eq(anime.id, id));
  revalidatePath("/anime");
  revalidatePath("/library");
  revalidatePath("/dashboard");
  redirect("/anime");
}
