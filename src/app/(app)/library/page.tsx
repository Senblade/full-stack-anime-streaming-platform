import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUserLibrary } from "@/lib/queries";
import { formatHours } from "@/lib/utils";
import { LibraryView } from "@/components/library/library-view";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "My library" };

export default async function LibraryPage() {
  const user = await requireUser();
  const rows = await getUserLibrary(user.id);
  const minutes = rows.reduce((s, r) => s + r.entry.progress * r.anime.episodeLength, 0);
  const episodes = rows.reduce((s, r) => s + r.entry.progress, 0);

  return (
    <div>
      <PageHeader
        title="My library"
        description={rows.length ? `${rows.length} titles · ${episodes.toLocaleString()} episodes · ${formatHours(minutes)} watched. Progress and scores save instantly.` : "Everything you're watching, finished, or planning — in one place."}
        actions={
          <ButtonLink href="/anime" size="sm" variant="secondary">
            <Plus className="h-4 w-4" /> Add titles
          </ButtonLink>
        }
      />
      <LibraryView rows={rows} />
    </div>
  );
}
