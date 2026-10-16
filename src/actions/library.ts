"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { anime, libraryEntries } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { LIBRARY_STATUSES } from "@/lib/constants";
import { clamp } from "@/lib/utils";

export type LibraryPatch = {
  status?: string;
  progress?: number;
  score?: number | null;
  favorite?: boolean;
  notes?: string;
};

function revalidateLibraryViews(slug?: string) {
  revalidatePath("/library");
  revalidatePath("/dashboard");
  revalidatePath("/anime");
  if (slug) revalidatePath(`/anime/${slug}`);
}

export async function upsertLibraryEntryAction(animeId: number, patch: LibraryPatch) {
  const user = await requireUser();
  const [target] = await db.select({ id: anime.id, episodes: anime.episodes, slug: anime.slug }).from(anime).where(eq(anime.id, animeId)).limit(1);
  if (!target) return { ok: false as const, error: "Anime not found." };

  if (patch.status && !LIBRARY_STATUSES.some((s) => s.value === patch.status)) {
    return { ok: false as const, error: "Invalid status." };
  }
  if (patch.score != null && (patch.score < 1 || patch.score > 10)) {
    return { ok: false as const, error: "Score must be between 1 and 10." };
  }

  const [existing] = await db
    .select()
    .from(libraryEntries)
    .where(and(eq(libraryEntries.userId, user.id), eq(libraryEntries.animeId, animeId)))
    .limit(1);

  const nextStatus = patch.status ?? existing?.status ?? "plan_to_watch";
  let nextProgress = patch.progress ?? existing?.progress ?? 0;
  if (patch.status === "completed") nextProgress = target.episodes;
  if (patch.status === "plan_to_watch" && patch.progress == null && !existing) nextProgress = 0;
  nextProgress = clamp(Math.round(nextProgress), 0, target.episodes);
  const finalStatus = nextProgress >= target.episodes && nextStatus === "watching" ? "completed" : nextStatus;

  const values = {
    status: finalStatus,
    progress: nextProgress,
    score: patch.score === undefined ? (existing?.score ?? null) : patch.score,
    favorite: patch.favorite ?? existing?.favorite ?? false,
    notes: patch.notes ?? existing?.notes ?? "",
    updatedAt: new Date(),
  };

  let entry;
  if (existing) {
    [entry] = await db.update(libraryEntries).set(values).where(eq(libraryEntries.id, existing.id)).returning();
  } else {
    [entry] = await db.insert(libraryEntries).values({ userId: user.id, animeId, ...values }).returning();
  }
  revalidateLibraryViews(target.slug);
  return { ok: true as const, entry };
}

export async function removeLibraryEntryAction(animeId: number) {
  const user = await requireUser();
  const [target] = await db.select({ slug: anime.slug }).from(anime).where(eq(anime.id, animeId)).limit(1);
  await db.delete(libraryEntries).where(and(eq(libraryEntries.userId, user.id), eq(libraryEntries.animeId, animeId)));
  revalidateLibraryViews(target?.slug);
  return { ok: true as const };
}
