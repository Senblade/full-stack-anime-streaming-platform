import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMessages, getParticipants, getPartyByCode, serializeParty } from "@/lib/parties";
import { PartyRoom } from "@/components/parties/party-room";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const party = await getPartyByCode(code);
  return { title: party ? `${party.name} · Watch party` : "Watch party" };
}

export default async function PartyRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser();
  const { code } = await params;
  const party = await getPartyByCode(code);
  if (!party) notFound();

  const [participants, messages] = await Promise.all([getParticipants(party.id, party.hostId), getMessages(party.id)]);
  const me = participants.find((p) => p.userId === user.id);

  return (
    <PartyRoom
      key={party.id}
      user={user}
      initial={{
        party: serializeParty(party),
        participants,
        messages,
        me: { isMember: Boolean(me), isHost: party.hostId === user.id },
        serverTime: new Date().toISOString(),
      }}
    />
  );
}
