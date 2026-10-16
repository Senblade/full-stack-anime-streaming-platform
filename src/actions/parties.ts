"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { anime, partyParticipants, users, watchParties } from "@/db/schema";
import { canManage, requireUser } from "@/lib/auth";
import { MAX_PARTY_SIZE } from "@/lib/constants";
import { addSystemMessage, joinParty } from "@/lib/parties";
import { clamp, generatePartyCode } from "@/lib/utils";

export type PartyFormState = { error?: string } | null;

function parsePartyForm(formData: FormData, episodesAvailable: number) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const episode = Number(formData.get("episode") ?? 1);
  const maxParticipants = Number(formData.get("maxParticipants") ?? MAX_PARTY_SIZE);
  const isPrivate = formData.get("isPrivate") === "on";
  const startMode = String(formData.get("startMode") ?? "now");
  const scheduledRaw = String(formData.get("scheduledFor") ?? "");

  if (name.length < 3) return { error: "Give your party a name (at least 3 characters)." } as const;
  if (!Number.isFinite(episode) || episode < 1 || episode > episodesAvailable) return { error: `Episode must be between 1 and ${episodesAvailable}.` } as const;
  if (!Number.isFinite(maxParticipants) || maxParticipants < 2 || maxParticipants > MAX_PARTY_SIZE) {
    return { error: `Room size must be between 2 and ${MAX_PARTY_SIZE} people.` } as const;
  }
  let scheduledFor: Date | null = null;
  if (startMode === "later") {
    const d = new Date(scheduledRaw);
    if (!scheduledRaw || Number.isNaN(d.getTime())) return { error: "Pick a valid date and time for the party." } as const;
    scheduledFor = d;
  }
  return {
    data: {
      name,
      description,
      episode: Math.round(episode),
      maxParticipants: Math.round(maxParticipants),
      isPrivate,
      scheduledFor,
      startMode,
    },
  } as const;
}

async function uniqueCode() {
  for (let i = 0; i < 10; i++) {
    const code = generatePartyCode();
    const [existing] = await db.select({ id: watchParties.id }).from(watchParties).where(eq(watchParties.code, code)).limit(1);
    if (!existing) return code;
  }
  return generatePartyCode(8);
}

export async function createPartyAction(_prev: PartyFormState, formData: FormData): Promise<PartyFormState> {
  const user = await requireUser();
  const animeId = Number(formData.get("animeId"));
  const [target] = await db.select().from(anime).where(eq(anime.id, animeId)).limit(1);
  if (!target) return { error: "Please choose an anime to watch." };

  const parsed = parsePartyForm(formData, target.episodes);
  if ("error" in parsed) return { error: parsed.error };

  const code = await uniqueCode();
  const now = new Date();
  const [party] = await db
    .insert(watchParties)
    .values({
      code,
      hostId: user.id,
      animeId: target.id,
      name: parsed.data.name,
      description: parsed.data.description,
      episode: parsed.data.episode,
      maxParticipants: parsed.data.maxParticipants,
      isPrivate: parsed.data.isPrivate,
      status: parsed.data.startMode === "later" ? "scheduled" : "live",
      scheduledFor: parsed.data.scheduledFor,
      playbackState: "paused",
      playbackPosition: 0,
      playbackUpdatedAt: now,
    })
    .returning();

  await db.insert(partyParticipants).values({ partyId: party.id, userId: user.id });
  await addSystemMessage(party.id, `${user.displayName} opened the room`);
  revalidatePath("/parties");
  revalidatePath("/dashboard");
  redirect(`/parties/${party.code}`);
}

export async function updatePartyAction(partyId: number, _prev: PartyFormState, formData: FormData): Promise<PartyFormState> {
  const user = await requireUser();
  const [party] = await db.select().from(watchParties).where(eq(watchParties.id, partyId)).limit(1);
  if (!party) return { error: "Party not found." };
  if (!canManage(user, party.hostId)) return { error: "Only the host can edit this party." };
  const [target] = await db.select().from(anime).where(eq(anime.id, party.animeId)).limit(1);

  const parsed = parsePartyForm(formData, target?.episodes ?? 9999);
  if ("error" in parsed) return { error: parsed.error };

  const episodeChanged = parsed.data.episode !== party.episode;
  await db
    .update(watchParties)
    .set({
      name: parsed.data.name,
      description: parsed.data.description,
      episode: parsed.data.episode,
      maxParticipants: parsed.data.maxParticipants,
      isPrivate: parsed.data.isPrivate,
      scheduledFor: party.status === "scheduled" ? parsed.data.scheduledFor ?? party.scheduledFor : party.scheduledFor,
      ...(episodeChanged ? { playbackState: "paused", playbackPosition: 0, playbackUpdatedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(watchParties.id, partyId));
  if (episodeChanged) await addSystemMessage(partyId, `${user.displayName} switched to episode ${parsed.data.episode}`);
  revalidatePath("/parties");
  revalidatePath(`/parties/${party.code}`);
  return null;
}

export async function startPartyAction(partyId: number) {
  const user = await requireUser();
  const [party] = await db.select().from(watchParties).where(eq(watchParties.id, partyId)).limit(1);
  if (!party) return { ok: false as const, error: "Party not found." };
  if (!canManage(user, party.hostId)) return { ok: false as const, error: "Only the host can start the party." };
  await db
    .update(watchParties)
    .set({ status: "live", playbackState: "paused", playbackPosition: 0, playbackUpdatedAt: new Date(), updatedAt: new Date() })
    .where(eq(watchParties.id, partyId));
  await addSystemMessage(partyId, "The party is now live 🎬");
  revalidatePath("/parties");
  revalidatePath(`/parties/${party.code}`);
  return { ok: true as const };
}

export async function endPartyAction(partyId: number) {
  const user = await requireUser();
  const [party] = await db.select().from(watchParties).where(eq(watchParties.id, partyId)).limit(1);
  if (!party) return { ok: false as const, error: "Party not found." };
  if (!canManage(user, party.hostId)) return { ok: false as const, error: "Only the host can end the party." };
  await db
    .update(watchParties)
    .set({ status: "ended", playbackState: "paused", endedAt: new Date(), updatedAt: new Date() })
    .where(eq(watchParties.id, partyId));
  await db.delete(partyParticipants).where(eq(partyParticipants.partyId, partyId));
  await addSystemMessage(partyId, "The host ended the party");
  revalidatePath("/parties");
  revalidatePath(`/parties/${party.code}`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function deletePartyAction(partyId: number) {
  const user = await requireUser();
  const [party] = await db.select().from(watchParties).where(eq(watchParties.id, partyId)).limit(1);
  if (!party) return { ok: false as const, error: "Party not found." };
  if (!canManage(user, party.hostId)) return { ok: false as const, error: "Only the host can delete the party." };
  await db.delete(watchParties).where(eq(watchParties.id, partyId));
  revalidatePath("/parties");
  revalidatePath("/dashboard");
  redirect("/parties");
}

export async function removeParticipantAction(partyId: number, userId: number) {
  const user = await requireUser();
  const [party] = await db.select().from(watchParties).where(eq(watchParties.id, partyId)).limit(1);
  if (!party) return { ok: false as const, error: "Party not found." };
  if (!canManage(user, party.hostId)) return { ok: false as const, error: "Only the host can remove people." };
  if (userId === party.hostId) return { ok: false as const, error: "The host cannot be removed." };
  const [target] = await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, userId)).limit(1);
  await db.delete(partyParticipants).where(and(eq(partyParticipants.partyId, partyId), eq(partyParticipants.userId, userId)));
  if (target) await addSystemMessage(partyId, `${target.displayName} was removed by the host`);
  return { ok: true as const };
}

export async function joinByCodeAction(_prev: PartyFormState, formData: FormData): Promise<PartyFormState> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  if (code.length < 4) return { error: "Enter the room code shared by the host." };
  const [party] = await db.select().from(watchParties).where(eq(watchParties.code, code)).limit(1);
  if (!party) return { error: `No room found with code ${code}.` };
  const result = await joinParty(party, user);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/parties/${code}`);
  redirect(`/parties/${code}`);
}
