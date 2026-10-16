import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getParticipants, getPartyByCode, joinParty } from "@/lib/parties";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { code } = await params;
  const party = await getPartyByCode(code);
  if (!party) return NextResponse.json({ error: "Party not found" }, { status: 404 });

  const result = await joinParty(party, user);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  const participants = await getParticipants(party.id, party.hostId);
  return NextResponse.json({ ok: true, participants });
}
