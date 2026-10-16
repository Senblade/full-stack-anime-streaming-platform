import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { partyMessages, partyParticipants } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getPartyByCode } from "@/lib/parties";
import { REACTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const party = await getPartyByCode(code);
  if (!party) return NextResponse.json({ error: "Party not found" }, { status: 404 });
  if (party.status === "ended") return NextResponse.json({ error: "This party has ended" }, { status: 400 });

  const [member] = await db
    .select({ id: partyParticipants.id })
    .from(partyParticipants)
    .where(and(eq(partyParticipants.partyId, party.id), eq(partyParticipants.userId, user.id)))
    .limit(1);
  if (!member) return NextResponse.json({ error: "Join the room to chat" }, { status: 403 });

  const payload = (await request.json().catch(() => ({}))) as { body?: string; type?: string };
  const type = payload.type === "reaction" ? "reaction" : "chat";
  const body = String(payload.body ?? "").trim().slice(0, 500);
  if (!body) return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  if (type === "reaction" && !REACTIONS.includes(body)) return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });

  const [message] = await db.insert(partyMessages).values({ partyId: party.id, userId: user.id, body, type }).returning();
  return NextResponse.json({
    message: {
      id: message.id,
      type: message.type,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      user: { id: user.id, username: user.username, displayName: user.displayName, avatarColor: user.avatarColor },
    },
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { code } = await params;
  const party = await getPartyByCode(code);
  if (!party) return NextResponse.json({ error: "Party not found" }, { status: 404 });
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const [msg] = await db.select().from(partyMessages).where(eq(partyMessages.id, id)).limit(1);
  if (!msg || msg.partyId !== party.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (msg.userId !== user.id && party.hostId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await db.delete(partyMessages).where(eq(partyMessages.id, id));
  return NextResponse.json({ ok: true });
}
