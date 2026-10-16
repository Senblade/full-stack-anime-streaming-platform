import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canManage, requireUser } from "@/lib/auth";
import { getAnimeBySlug } from "@/lib/queries";
import { AnimeForm } from "@/components/anime/anime-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Edit anime" };

export default async function EditAnimePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const anime = await getAnimeBySlug(slug);
  if (!anime) notFound();
  if (!canManage(user, anime.createdById)) redirect(`/anime/${slug}`);

  return (
    <div>
      <PageHeader eyebrow="Catalog" title={`Edit ${anime.title}`} description="Update details, artwork style, and genres. Changes are visible to everyone immediately." />
      <AnimeForm anime={anime} />
    </div>
  );
}
