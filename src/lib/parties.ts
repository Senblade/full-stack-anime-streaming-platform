import "server-only";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { anime, partyMessages, partyParticipants, users, watchParties, type WatchParty } from "@/db/schema";
import { MAX_PARTY_SIZE } from "@/lib/constants";

export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export type PartyWithRelations = WatchParty & {
  anime: typeof anime.$inferSelect;
  host: { id: number; username: string; displayName: string; avatarColor: string };
};

export type ParticipantView = {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  avatarColor: string;
  joinedAt: string;
  lastSeenAt: string;
  online: boolean;
  isHost: boolean;
};

export type MessageView = {
  id: number;
  type: string;
  body: string;
  createdAt: string;
  user: { id: number; username: string; displayName: string; avatarColor: string } | null;
};

export async function getPartyByCode(code: string): Promise<PartyWithRelations | null> {
  const rows = await db
    .select({
      party: watchParties,
      anime,
      host: { id: users.id, username: users.username, displayName: users.displayName, avatarColor: users.avatarColor },
    })
    .from(watchParties)
    .innerJoin(anime, eq(watchParties.animeId, anime.id))
    .innerJoin(users, eq(watchParties.hostId, users.id))
    .where(eq(watchParties.code, code.toUpperCase()))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...row.party, anime: row.anime, host: row.host };
}

export async function getParticipants(partyId: number, hostId: number): Promise<ParticipantView[]> {
  const rows = await db
    .select({
      id: partyParticipants.id,
      userId: partyParticipants.userId,
      joinedAt: partyParticipants.joinedAt,
      lastSeenAt: partyParticipants.lastSeenAt,
      username: users.username,
      displayName: users.displayName,
      avatarColor: users.avatarColor,
    })
    .from(partyParticipants)
    .innerJoin(users, eq(partyParticipants.userId, users.id))
    .where(eq(partyParticipants.partyId, partyId))
    .orderBy(asc(partyParticipants.joinedAt));
  const now = Date.now();
  return rows.map((r) => ({
    ...r,
    joinedAt: r.joinedAt.toISOString(),
    lastSeenAt: r.lastSeenAt.toISOString(),
    online: now - r.lastSeenAt.getTime() < ONLINE_WINDOW_MS,
    isHost: r.userId === hostId,
  }));
}

export async function getMessages(partyId: number, afterId = 0, limit = 200): Promise<MessageView[]> {
  const rows = await db
    .select({
      id: partyMessages.id,
      type: partyMessages.type,
      body: partyMessages.body,
      createdAt: partyMessages.createdAt,
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarColor: users.avatarColor,
    })
    .from(partyMessages)
    .leftJoin(users, eq(partyMessages.userId, users.id))
    .where(and(eq(partyMessages.partyId, partyId), gt(partyMessages.id, afterId)))
    .orderBy(asc(partyMessages.id))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    user: r.userId != null ? { id: r.userId, username: r.username!, displayName: r.displayName!, avatarColor: r.avatarColor! } : null,
  }));
}

export async function addSystemMessage(partyId: number, body: string) {
  await db.insert(partyMessages).values({ partyId, userId: null, type: "system", body });
}

export async function countParticipants(partyId: number) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(partyParticipants)
    .where(eq(partyParticipants.partyId, partyId));
  return Number(row?.count ?? 0);
}

export async function joinParty(party: WatchParty, user: { id: number; displayName: string }) {
  if (party.status === "ended") return { ok: false as const, error: "This party has ended." };

  const [existing] = await db
    .select({ id: partyParticipants.id })
    .from(partyParticipants)
    .where(and(eq(partyParticipants.partyId, party.id), eq(partyParticipants.userId, user.id)))
    .limit(1);
  if (existing) {
    await db.update(partyParticipants).set({ lastSeenAt: new Date() }).where(eq(partyParticipants.id, existing.id));
    return { ok: true as const, alreadyJoined: true };
  }

  const count = await countParticipants(party.id);
  const cap = Math.min(party.maxParticipants, MAX_PARTY_SIZE);
  if (count >= cap && party.hostId !== user.id) {
    return { ok: false as const, error: `This room is full (${cap}/${cap} seats taken).` };
  }

  await db.insert(partyParticipants).values({ partyId: party.id, userId: user.id });
  await addSystemMessage(party.id, `${user.displayName} joined`);
  return { ok: true as const, alreadyJoined: false };
}

export async function leaveParty(party: WatchParty, user: { id: number; displayName: string }) {
  const deleted = await db
    .delete(partyParticipants)
    .where(and(eq(partyParticipants.partyId, party.id), eq(partyParticipants.userId, user.id)))
    .returning({ id: partyParticipants.id });
  if (deleted.length > 0) {
    await addSystemMessage(party.id, `${user.displayName} left`);
  }
  return { ok: true as const };
}

export async function touchPresence(partyId: number, userId: number) {
  await db
    .update(partyParticipants)
    .set({ lastSeenAt: new Date() })
    .where(and(eq(partyParticipants.partyId, partyId), eq(partyParticipants.userId, userId)));
}

/** Current playback position in seconds, extrapolated from the last server update. */
export function currentPosition(party: Pick<WatchParty, "playbackState" | "playbackPosition" | "playbackUpdatedAt">) {
  if (party.playbackState !== "playing") return party.playbackPosition;
  const elapsed = (Date.now() - new Date(party.playbackUpdatedAt).getTime()) / 1000;
  return party.playbackPosition + Math.max(0, elapsed);
}

export function serializeParty(party: PartyWithRelations) {
  return {
    id: party.id,
    code: party.code,
    name: party.name,
    description: party.description,
    episode: party.episode,
    maxParticipants: party.maxParticipants,
    isPrivate: party.isPrivate,
    status: party.status,
    scheduledFor: party.scheduledFor ? party.scheduledFor.toISOString() : null,
    playbackState: party.playbackState,
    playbackPosition: party.playbackPosition,
    playbackUpdatedAt: party.playbackUpdatedAt.toISOString(),
    createdAt: party.createdAt.toISOString(),
    endedAt: party.endedAt ? party.endedAt.toISOString() : null,
    hostId: party.hostId,
    host: party.host,
    anime: {
      id: party.anime.id,
      slug: party.anime.slug,
      title: party.anime.title,
      titleJapanese: party.anime.titleJapanese,
      episodes: party.anime.episodes,
      episodeLength: party.anime.episodeLength,
      artKey: party.anime.artKey,
      hueShift: party.anime.hueShift,
      accentColor: party.anime.accentColor,
      type: party.anime.type,
      year: party.anime.year,
      studio: party.anime.studio,
    },
  };
}

export type SerializedParty = ReturnType<typeof serializeParty>;
