import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPartyByCode, leaveParty } from "@/lib/parties";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { code } = await params;
  const party = await getPartyByCode(code);
  if (!party) return NextResponse.json({ error: "Party not found" }, { status: 404 });
  await leaveParty(party, user);
  return NextResponse.json({ ok: true });
}
