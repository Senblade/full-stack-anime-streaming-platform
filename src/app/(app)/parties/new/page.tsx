import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getAnimeOptions } from "@/lib/queries";
import { PartyForm } from "@/components/parties/party-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "New watch party" };

export default async function NewPartyPage({ searchParams }: { searchParams: Promise<{ anime?: string }> }) {
  await requireUser();
  const { anime } = await searchParams;
  const options = await getAnimeOptions();
  const initialAnimeId = anime ? Number(anime) || undefined : undefined;

  return (
    <div>
      <PageHeader eyebrow="Watch together" title="Host a watch party" description="Set up a synced room. You control playback; up to 9 friends can join with the code." />
      <PartyForm options={options} initialAnimeId={initialAnimeId} />
    </div>
  );
}
