import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { anime, libraryEntries, partyParticipants, reviews, users, watchParties, type Anime } from "@/db/schema";

export type AnimeWithLibrary = Anime & {
  libraryStatus: string | null;
  libraryProgress: number | null;
  reviewCount: number;
};

export type AnimeFilters = {
  q?: string;
  genre?: string;
  status?: string;
  type?: string;
  sort?: "popular" | "rating" | "newest" | "title" | "year";
  page?: number;
  pageSize?: number;
};

export async function getAnimeList(userId: number, filters: AnimeFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 24;
  const where: SQL[] = [];
  if (filters.q) {
    const q = `%${filters.q.trim()}%`;
    where.push(or(ilike(anime.title, q), ilike(anime.titleJapanese, q), ilike(anime.studio, q))!);
  }
  if (filters.genre) where.push(sql`${filters.genre} = any(${anime.genres})`);
  if (filters.status) where.push(eq(anime.status, filters.status));
  if (filters.type) where.push(eq(anime.type, filters.type));

  const orderBy =
    filters.sort === "rating"
      ? [desc(anime.rating), desc(anime.popularity)]
      : filters.sort === "newest"
        ? [desc(anime.createdAt)]
        : filters.sort === "title"
          ? [asc(anime.title)]
          : filters.sort === "year"
            ? [desc(anime.year), desc(anime.popularity)]
            : [desc(anime.popularity), desc(anime.rating)];

  const whereClause = where.length ? and(...where) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        anime,
        libraryStatus: libraryEntries.status,
        libraryProgress: libraryEntries.progress,
        reviewCount: sql<number>`(select count(*)::int from ${reviews} where ${reviews.animeId} = ${anime.id})`,
      })
      .from(anime)
      .leftJoin(libraryEntries, and(eq(libraryEntries.animeId, anime.id), eq(libraryEntries.userId, userId)))
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(anime).where(whereClause),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);
  return {
    items: rows.map((r) => ({ ...r.anime, libraryStatus: r.libraryStatus, libraryProgress: r.libraryProgress, reviewCount: Number(r.reviewCount) })) as AnimeWithLibrary[],
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAnimeBySlug(slug: string) {
  const [row] = await db.select().from(anime).where(eq(anime.slug, slug)).limit(1);
  return row ?? null;
}

export async function getAnimeOptions() {
  return db
    .select({ id: anime.id, title: anime.title, episodes: anime.episodes, artKey: anime.artKey, hueShift: anime.hueShift, year: anime.year, type: anime.type })
    .from(anime)
    .orderBy(asc(anime.title));
}

export async function getLibraryEntry(userId: number, animeId: number) {
  const [row] = await db
    .select()
    .from(libraryEntries)
    .where(and(eq(libraryEntries.userId, userId), eq(libraryEntries.animeId, animeId)))
    .limit(1);
  return row ?? null;
}

export type ReviewWithUser = {
  id: number;
  animeId: number;
  rating: number;
  title: string;
  body: string;
  containsSpoilers: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: { id: number; username: string; displayName: string; avatarColor: string };
};

export async function getReviewsForAnime(animeId: number): Promise<ReviewWithUser[]> {
  const rows = await db
    .select({
      id: reviews.id,
      animeId: reviews.animeId,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      containsSpoilers: reviews.containsSpoilers,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
      user: { id: users.id, username: users.username, displayName: users.displayName, avatarColor: users.avatarColor },
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.animeId, animeId))
    .orderBy(desc(reviews.createdAt));
  return rows;
}

export async function getUserReviews(userId: number) {
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      containsSpoilers: reviews.containsSpoilers,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
      anime: { id: anime.id, slug: anime.slug, title: anime.title, artKey: anime.artKey, hueShift: anime.hueShift, accentColor: anime.accentColor, year: anime.year, type: anime.type },
    })
    .from(reviews)
    .innerJoin(anime, eq(reviews.animeId, anime.id))
    .where(eq(reviews.userId, userId))
    .orderBy(desc(reviews.createdAt));
}

export async function getRelatedAnime(current: Anime, limit = 6) {
  if (current.genres.length === 0) return [];
  const rows = await db
    .select()
    .from(anime)
    .where(and(ne(anime.id, current.id), sql`${anime.genres} && ${sql.raw(`ARRAY[${current.genres.map((g) => `'${g.replace(/'/g, "''")}'`).join(",")}]::text[]`)}`))
    .orderBy(desc(anime.popularity))
    .limit(limit);
  return rows;
}

export type LibraryRow = {
  entry: typeof libraryEntries.$inferSelect;
  anime: Anime;
};

export async function getUserLibrary(userId: number): Promise<LibraryRow[]> {
  const rows = await db
    .select({ entry: libraryEntries, anime })
    .from(libraryEntries)
    .innerJoin(anime, eq(libraryEntries.animeId, anime.id))
    .where(eq(libraryEntries.userId, userId))
    .orderBy(desc(libraryEntries.updatedAt));
  return rows;
}

export type PartyListItem = {
  id: number;
  code: string;
  name: string;
  description: string;
  episode: number;
  maxParticipants: number;
  isPrivate: boolean;
  status: string;
  scheduledFor: Date | null;
  createdAt: Date;
  endedAt: Date | null;
  hostId: number;
  participantCount: number;
  host: { id: number; username: string; displayName: string; avatarColor: string };
  anime: { id: number; slug: string; title: string; artKey: string; hueShift: number; accentColor: string; episodes: number };
  isMember: boolean;
};

export async function getParties(userId: number, opts: { status?: string; animeId?: number; limit?: number; includePrivate?: boolean } = {}): Promise<PartyListItem[]> {
  const where: SQL[] = [];
  if (opts.status) where.push(eq(watchParties.status, opts.status));
  if (opts.animeId) where.push(eq(watchParties.animeId, opts.animeId));
  if (!opts.includePrivate) where.push(or(eq(watchParties.isPrivate, false), eq(watchParties.hostId, userId))!);

  const rows = await db
    .select({
      id: watchParties.id,
      code: watchParties.code,
      name: watchParties.name,
      description: watchParties.description,
      episode: watchParties.episode,
      maxParticipants: watchParties.maxParticipants,
      isPrivate: watchParties.isPrivate,
      status: watchParties.status,
      scheduledFor: watchParties.scheduledFor,
      createdAt: watchParties.createdAt,
      endedAt: watchParties.endedAt,
      hostId: watchParties.hostId,
      participantCount: sql<number>`(select count(*)::int from ${partyParticipants} where ${partyParticipants.partyId} = ${watchParties.id})`,
      isMember: sql<boolean>`exists(select 1 from ${partyParticipants} where ${partyParticipants.partyId} = ${watchParties.id} and ${partyParticipants.userId} = ${userId})`,
      host: { id: users.id, username: users.username, displayName: users.displayName, avatarColor: users.avatarColor },
      anime: { id: anime.id, slug: anime.slug, title: anime.title, artKey: anime.artKey, hueShift: anime.hueShift, accentColor: anime.accentColor, episodes: anime.episodes },
    })
    .from(watchParties)
    .innerJoin(users, eq(watchParties.hostId, users.id))
    .innerJoin(anime, eq(watchParties.animeId, anime.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(
      sql`case ${watchParties.status} when 'live' then 0 when 'scheduled' then 1 else 2 end`,
      asc(watchParties.scheduledFor),
      desc(watchParties.createdAt),
    )
    .limit(opts.limit ?? 100);
  return rows.map((r) => ({ ...r, participantCount: Number(r.participantCount), isMember: Boolean(r.isMember) }));
}

export async function getMyParties(userId: number): Promise<PartyListItem[]> {
  const memberIds = await db
    .select({ partyId: partyParticipants.partyId })
    .from(partyParticipants)
    .where(eq(partyParticipants.userId, userId));
  const ids = memberIds.map((m) => m.partyId);
  const all = await getParties(userId, { includePrivate: true, limit: 200 });
  return all.filter((p) => p.hostId === userId || ids.includes(p.id));
}

export async function getDashboardData(userId: number) {
  const [statusCounts, watchedMinutesRow, hostedRow, joinedRow, reviewRow, continueWatching, liveParties, trending, recentReviews, recentlyAdded] = await Promise.all([
    db
      .select({ status: libraryEntries.status, value: count() })
      .from(libraryEntries)
      .where(eq(libraryEntries.userId, userId))
      .groupBy(libraryEntries.status),
    db
      .select({ minutes: sql<number>`coalesce(sum(${libraryEntries.progress} * ${anime.episodeLength}), 0)::int` })
      .from(libraryEntries)
      .innerJoin(anime, eq(libraryEntries.animeId, anime.id))
      .where(eq(libraryEntries.userId, userId)),
    db.select({ value: count() }).from(watchParties).where(eq(watchParties.hostId, userId)),
    db.select({ value: count() }).from(partyParticipants).where(eq(partyParticipants.userId, userId)),
    db.select({ value: count() }).from(reviews).where(eq(reviews.userId, userId)),
    db
      .select({ entry: libraryEntries, anime })
      .from(libraryEntries)
      .innerJoin(anime, eq(libraryEntries.animeId, anime.id))
      .where(and(eq(libraryEntries.userId, userId), inArray(libraryEntries.status, ["watching", "on_hold"])))
      .orderBy(desc(libraryEntries.updatedAt))
      .limit(6),
    getParties(userId, { status: "live", limit: 4 }),
    db.select().from(anime).orderBy(desc(anime.popularity), desc(anime.rating)).limit(8),
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        createdAt: reviews.createdAt,
        user: { id: users.id, username: users.username, displayName: users.displayName, avatarColor: users.avatarColor },
        anime: { slug: anime.slug, title: anime.title, artKey: anime.artKey, hueShift: anime.hueShift },
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .innerJoin(anime, eq(reviews.animeId, anime.id))
      .orderBy(desc(reviews.createdAt))
      .limit(5),
    db.select().from(anime).orderBy(desc(anime.createdAt)).limit(6),
  ]);

  const counts: Record<string, number> = {};
  for (const row of statusCounts) counts[row.status] = Number(row.value);
  const upcoming = await getParties(userId, { status: "scheduled", limit: 3 });

  return {
    counts,
    watchedMinutes: Number(watchedMinutesRow[0]?.minutes ?? 0),
    hosted: Number(hostedRow[0]?.value ?? 0),
    joined: Number(joinedRow[0]?.value ?? 0),
    reviews: Number(reviewRow[0]?.value ?? 0),
    continueWatching,
    liveParties,
    upcoming,
    trending,
    recentReviews,
    recentlyAdded,
  };
}

export async function getLandingHighlights() {
  const [trending, totals] = await Promise.all([
    db.select().from(anime).orderBy(desc(anime.popularity)).limit(12),
    db.select({ anime: sql<number>`(select count(*)::int from ${anime})`, parties: sql<number>`(select count(*)::int from ${watchParties})`, users: sql<number>`(select count(*)::int from ${users})` }).from(anime).limit(1),
  ]);
  return { trending, totals: totals[0] ?? { anime: 0, parties: 0, users: 0 } };
}
