"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { anime, reviews, type Review } from "@/db/schema";
import { canManage, requireUser } from "@/lib/auth";

export type ReviewResult = { ok: true; review: Review } | { ok: false; error: string };
export type SimpleResult = { ok: true } | { ok: false; error: string };

export type ReviewInput = {
  rating: number;
  title: string;
  body: string;
  containsSpoilers: boolean;
};

type Validated = { ok: false; error: string } | { ok: true; data: { rating: number; title: string; body: string; containsSpoilers: boolean } };

function validate(input: ReviewInput): Validated {
  const rating = Math.round(Number(input.rating));
  const title = String(input.title ?? "").trim();
  const body = String(input.body ?? "").trim();
  if (!Number.isFinite(rating) || rating < 1 || rating > 10) return { ok: false, error: "Rating must be between 1 and 10." };
  if (title.length < 3) return { ok: false, error: "Give your review a short title (at least 3 characters)." };
  if (body.length < 20) return { ok: false, error: "Reviews need at least 20 characters. Tell us what you thought!" };
  return { ok: true, data: { rating, title, body, containsSpoilers: Boolean(input.containsSpoilers) } };
}

async function revalidateForAnime(animeId: number) {
  const [a] = await db.select({ slug: anime.slug }).from(anime).where(eq(anime.id, animeId)).limit(1);
  if (a) revalidatePath(`/anime/${a.slug}`);
  revalidatePath("/reviews");
  revalidatePath("/dashboard");
}

export async function createReviewAction(animeId: number, input: ReviewInput): Promise<ReviewResult> {
  const user = await requireUser();
  const parsed = validate(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const [review] = await db
    .insert(reviews)
    .values({ userId: user.id, animeId, ...parsed.data })
    .returning();
  await revalidateForAnime(animeId);
  return { ok: true, review };
}

export async function updateReviewAction(reviewId: number, input: ReviewInput): Promise<ReviewResult> {
  const user = await requireUser();
  const [existing] = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
  if (!existing) return { ok: false, error: "Review not found." };
  if (!canManage(user, existing.userId)) return { ok: false, error: "You can only edit your own reviews." };
  const parsed = validate(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const [review] = await db
    .update(reviews)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(reviews.id, reviewId))
    .returning();
  await revalidateForAnime(existing.animeId);
  return { ok: true, review };
}

export async function deleteReviewAction(reviewId: number): Promise<SimpleResult> {
  const user = await requireUser();
  const [existing] = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
  if (!existing) return { ok: false, error: "Review not found." };
  if (!canManage(user, existing.userId)) return { ok: false, error: "You can only delete your own reviews." };
  await db.delete(reviews).where(eq(reviews.id, reviewId));
  await revalidateForAnime(existing.animeId);
  return { ok: true };
}
