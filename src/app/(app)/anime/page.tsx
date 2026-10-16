import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, Plus, SearchX } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getAnimeList, type AnimeFilters } from "@/lib/queries";
import { AnimeGrid } from "@/components/anime/anime-card";
import { AnimeFilters as Filters } from "@/components/anime/anime-filters";
import { ButtonLink, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Browse anime" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AnimeBrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filters: AnimeFilters = {
    q: str("q"),
    genre: str("genre"),
    status: str("status"),
    type: str("type"),
    sort: (str("sort") as AnimeFilters["sort"]) ?? "popular",
    page: Number(str("page") ?? 1) || 1,
  };
  const result = await getAnimeList(user.id, filters);

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "page") params.set(k, v);
    if (page > 1) params.set("page", String(page));
    const s = params.toString();
    return `/anime${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Browse anime"
        description="Thousands of hours of stories. Filter by genre, status, or format — and add anything to your library in one click."
        actions={
          <ButtonLink href="/anime/new" size="sm">
            <Plus className="h-4 w-4" /> Add anime
          </ButtonLink>
        }
      />
      <Suspense>
        <Filters total={result.total} />
      </Suspense>

      <div className="mt-6">
        {result.items.length === 0 ? (
          <EmptyState
            icon={<SearchX className="h-6 w-6" />}
            title="No anime match those filters"
            description="Try a different genre or clear your search. Can't find a title? Add it to the catalog for everyone."
            action={
              <div className="flex gap-2">
                <Link href="/anime" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  Clear filters
                </Link>
                <ButtonLink href="/anime/new" size="sm">
                  <Plus className="h-4 w-4" /> Add anime
                </ButtonLink>
              </div>
            }
          />
        ) : (
          <AnimeGrid items={result.items} />
        )}
      </div>

      {result.pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
          <Link href={pageHref(result.page - 1)} aria-disabled={result.page <= 1} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), result.page <= 1 && "pointer-events-none opacity-40")}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Link>
          <span className="px-3 text-sm tabular-nums text-muted">
            Page {result.page} of {result.pages}
          </span>
          <Link href={pageHref(result.page + 1)} aria-disabled={result.page >= result.pages} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), result.page >= result.pages && "pointer-events-none opacity-40")}>
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        </nav>
      )}
    </div>
  );
}
