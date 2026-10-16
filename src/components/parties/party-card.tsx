import Link from "next/link";
import { CalendarClock, Lock, Users } from "lucide-react";
import type { PartyListItem } from "@/lib/queries";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { AnimeCover } from "@/components/anime/anime-cover";
import { Avatar } from "@/components/ui/avatar";
import { Badge, LiveDot, partyTone } from "@/components/ui/badge";

export function PartyCard({ party, currentUserId, compact }: { party: PartyListItem; currentUserId: number; compact?: boolean }) {
  const isHost = party.hostId === currentUserId;
  const full = party.participantCount >= party.maxParticipants;
  return (
    <Link
      href={`/parties/${party.code}`}
      className={cn(
        "group relative flex animate-fade-up gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-4 transition hover:border-brand/40 hover:shadow-glow",
        party.status === "live" && "border-success/25",
      )}
    >
      <div className={cn("relative shrink-0", compact ? "w-16" : "w-20 sm:w-24")}>
        <AnimeCover anime={party.anime} showTitle={false} rounded="rounded-xl" />
        <div className="absolute inset-x-0 bottom-0 rounded-b-xl bg-black/70 px-1.5 py-1 text-center text-[10px] font-semibold text-white">EP {party.episode}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={partyTone(party.status)}>
            {party.status === "live" && <LiveDot />}
            {party.status === "live" ? "Live now" : party.status === "scheduled" ? "Scheduled" : "Ended"}
          </Badge>
          {party.isPrivate && (
            <Badge tone="neutral">
              <Lock className="h-3 w-3" /> Private
            </Badge>
          )}
          {isHost && <Badge tone="pink">You host</Badge>}
          {!isHost && party.isMember && party.status !== "ended" && <Badge tone="accent">Joined</Badge>}
        </div>
        <h3 className="mt-1.5 line-clamp-1 text-base font-semibold group-hover:text-violet-200">{party.name}</h3>
        <p className="line-clamp-1 text-sm text-muted">{party.anime.title}</p>
        {party.description && !compact && <p className="mt-1 line-clamp-1 text-xs text-muted/80">{party.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <Avatar name={party.host.displayName} color={party.host.avatarColor} size="xs" />
            {party.host.displayName}
          </span>
          <span className={cn("flex items-center gap-1", full && party.status !== "ended" && "text-warning")}>
            <Users className="h-3.5 w-3.5" />
            {party.status === "ended" ? "Finished" : `${party.participantCount}/${party.maxParticipants} seats`}
          </span>
          {party.status === "scheduled" && party.scheduledFor && (
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" /> {formatDateTime(party.scheduledFor)}
            </span>
          )}
          {party.status === "ended" && party.endedAt && <span>{timeAgo(party.endedAt)}</span>}
        </div>
      </div>
      <SeatMeter count={party.participantCount} max={party.maxParticipants} ended={party.status === "ended"} />
    </Link>
  );
}

function SeatMeter({ count, max, ended }: { count: number; max: number; ended: boolean }) {
  if (ended) return null;
  return (
    <div className="hidden shrink-0 flex-col justify-center gap-1 sm:flex" aria-hidden>
      {Array.from({ length: Math.min(max, 10) }).map((_, i) => (
        <span key={i} className={cn("h-1.5 w-6 rounded-full", i < count ? "bg-gradient-to-r from-brand to-brand-2" : "bg-surface-3")} />
      ))}
    </div>
  );
}
