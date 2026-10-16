import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { watchParties } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { addSystemMessage, currentPosition, getMessages, getParticipants, getPartyByCode, serializeParty, touchPresence } from "@/lib/parties";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  let party = await getPartyByCode(code);
  if (!party) return NextResponse.json({ error: "Party not found" }, { status: 404 });

  const url = new URL(request.url);
  const after = Number(url.searchParams.get("after") ?? 0) || 0;

  const [participants, messages] = await Promise.all([getParticipants(party.id, party.hostId), getMessages(party.id, after)]);
  const me = participants.find((p) => p.userId === user.id);
  if (me && party.status !== "ended") {
    await touchPresence(party.id, user.id);
  }

  // Autoplay: if the host has stepped away and the episode has finished,
  // keep the room rolling by queueing the next episode automatically.
  const host = participants.find((p) => p.userId === party!.hostId);
  const hostAway = !host || !host.online;
  if (party.status === "live" && party.playbackState === "playing" && hostAway) {
    const max = party.anime.episodeLength * 60;
    if (currentPosition(party) >= max) {
      const nextEpisode = party.episode < party.anime.episodes ? party.episode + 1 : 1;
      await db
        .update(watchParties)
        .set({ episode: nextEpisode, playbackPosition: 0, playbackState: "playing", playbackUpdatedAt: new Date(), updatedAt: new Date() })
        .where(eq(watchParties.id, party.id));
      await addSystemMessage(party.id, `Autoplay: now playing episode ${nextEpisode}`);
      party = (await getPartyByCode(code)) ?? party;
    }
  }

  return NextResponse.json({
    party: serializeParty(party),
    participants,
    messages,
    serverTime: new Date().toISOString(),
    me: { isMember: Boolean(me), isHost: party.hostId === user.id },
  });
}
