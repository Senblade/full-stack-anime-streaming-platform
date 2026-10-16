import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { AnimeForm } from "@/components/anime/anime-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Add anime" };

export default async function NewAnimePage() {
  await requireUser();
  return (
    <div>
      <PageHeader eyebrow="Catalog" title="Add an anime" description="Contribute a title to the shared catalog. You can edit or remove entries you've added at any time." />
      <AnimeForm />
    </div>
  );
}
