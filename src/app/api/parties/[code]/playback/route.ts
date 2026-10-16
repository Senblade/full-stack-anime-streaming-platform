import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { watchParties } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { addSystemMessage, getPartyByCode } from "@/lib/parties";
import { clamp } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const party = await getPartyByCode(code);
  if (!party) return NextResponse.json({ error: "Party not found" }, { status: 404 });
  if (party.hostId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Only the host controls playback" }, { status: 403 });
  }
  if (party.status !== "live") return NextResponse.json({ error: "Party is not live" }, { status: 400 });

  const payload = (await request.json().catch(() => ({}))) as { state?: string; position?: number; episode?: number };
  const update: Partial<typeof watchParties.$inferInsert> = { playbackUpdatedAt: new Date(), updatedAt: new Date() };

  const maxPosition = party.anime.episodeLength * 60;
  if (payload.state === "playing" || payload.state === "paused") update.playbackState = payload.state;
  if (typeof payload.position === "number" && Number.isFinite(payload.position)) {
    update.playbackPosition = clamp(payload.position, 0, maxPosition);
  }
  if (typeof payload.episode === "number" && Number.isFinite(payload.episode)) {
    const ep = clamp(Math.round(payload.episode), 1, party.anime.episodes);
    if (ep !== party.episode) {
      update.episode = ep;
      update.playbackPosition = 0;
      update.playbackState = "paused";
      await addSystemMessage(party.id, `${user.displayName} switched to episode ${ep}`);
    }
  }

  const [updated] = await db.update(watchParties).set(update).where(eq(watchParties.id, party.id)).returning();
  return NextResponse.json({
    playbackState: updated.playbackState,
    playbackPosition: updated.playbackPosition,
    playbackUpdatedAt: updated.playbackUpdatedAt.toISOString(),
    episode: updated.episode,
  });
}
