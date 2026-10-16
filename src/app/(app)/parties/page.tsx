import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, History, Plus, Radio, Tv } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getMyParties, getParties } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { JoinByCode } from "@/components/parties/join-by-code";
import { PartyCard } from "@/components/parties/party-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Watch parties" };

const TABS = [
  { key: "live", label: "Live now", icon: Radio },
  { key: "scheduled", label: "Upcoming", icon: CalendarClock },
  { key: "mine", label: "My parties", icon: Tv },
  { key: "ended", label: "Past", icon: History },
] as const;

export default async function PartiesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const { tab: rawTab } = await searchParams;
  const tab = (TABS.some((t) => t.key === rawTab) ? rawTab : "live") as (typeof TABS)[number]["key"];

  const [live, scheduled, ended, mine] = await Promise.all([
    getParties(user.id, { status: "live" }),
    getParties(user.id, { status: "scheduled" }),
    getParties(user.id, { status: "ended", limit: 30 }),
    getMyParties(user.id),
  ]);
  const lists = { live, scheduled, ended, mine };
  const items = lists[tab];

  return (
    <div>
      <PageHeader
        title="Watch parties"
        description="Synced rooms for up to 10 people. The host controls playback; everyone chats and reacts in real time."
        actions={
          <ButtonLink href="/parties/new" size="sm">
            <Plus className="h-4 w-4" /> New party
          </ButtonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="no-scrollbar -mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const count = lists[t.key].length;
              return (
                <Link
                  key={t.key}
                  href={`/parties?tab=${t.key}`}
                  className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition", tab === t.key ? "border-brand/60 bg-brand/15 text-violet-100" : "border-border bg-surface-2/60 text-muted hover:text-fg")}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                  <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", tab === t.key ? "bg-brand/30" : "bg-surface-3")}>{count}</span>
                </Link>
              );
            })}
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={<Tv className="h-6 w-6" />}
              title={tab === "live" ? "No rooms are live right now" : tab === "scheduled" ? "Nothing scheduled" : tab === "mine" ? "You haven't joined any parties yet" : "No past parties"}
              description={tab === "live" ? "Open a room and share the code — it only takes a few seconds." : tab === "scheduled" ? "Plan a party for later and friends can RSVP in the lobby." : tab === "mine" ? "Host a room or join one with a code to see it here." : "Ended parties keep their chat log for a nostalgic scroll."}
              action={
                <ButtonLink href="/parties/new" size="sm">
                  <Plus className="h-4 w-4" /> Create a party
                </ButtonLink>
              }
            />
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {items.map((p) => (
                <PartyCard key={p.id} party={p} currentUserId={user.id} />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <JoinByCode />
          <div className="rounded-2xl border border-border bg-surface p-5 text-sm">
            <h3 className="font-semibold">How it works</h3>
            <ol className="mt-3 space-y-2.5 text-xs text-muted">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[10px] font-bold text-violet-200">1</span>
                Pick an anime and episode, choose up to 10 seats.
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[10px] font-bold text-violet-200">2</span>
                Share the 6-letter room code or invite link.
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[10px] font-bold text-violet-200">3</span>
                Press play — everyone&apos;s player follows the host within a couple of seconds.
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
