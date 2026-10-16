"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, CalendarClock, Check, Copy, DoorOpen, Lock, Play, Settings2, Square, Trash2, Users, Link2 } from "lucide-react";
import { deletePartyAction, endPartyAction, removeParticipantAction, startPartyAction, updatePartyAction, type PartyFormState } from "@/actions/parties";
import type { SafeUser } from "@/lib/auth";
import { MAX_PARTY_SIZE } from "@/lib/constants";
import type { MessageView, ParticipantView, SerializedParty } from "@/lib/parties";
import { cn, formatDateTime } from "@/lib/utils";
import { Badge, LiveDot, partyTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { PartyChat } from "@/components/parties/party-chat";
import { PartyPlayer, computePosition, type PlaybackControl } from "@/components/parties/party-player";

type Initial = {
  party: SerializedParty;
  participants: ParticipantView[];
  messages: MessageView[];
  me: { isMember: boolean; isHost: boolean };
  serverTime: string;
};

type StateResponse = Initial;

export function PartyRoom({ initial, user }: { initial: Initial; user: SafeUser }) {
  const router = useRouter();
  const toast = useToast();
  const [party, setParty] = useState(initial.party);
  const [participants, setParticipants] = useState(initial.participants);
  const [messages, setMessages] = useState(initial.messages);
  const [isMember, setIsMember] = useState(initial.me.isMember);
  const [serverOffset, setServerOffset] = useState(() => new Date(initial.serverTime).getTime() - Date.now());
  const [floating, setFloating] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lifecyclePending, startLifecycle] = useTransition();
  const lastControlAt = useRef(0);
  const isHost = party.hostId === user.id || user.role === "admin";
  const canChat = isMember && party.status !== "ended";
  const seatsFull = participants.length >= Math.min(party.maxParticipants, MAX_PARTY_SIZE);

  const spawnReactions = useCallback((incoming: MessageView[]) => {
    const fresh = incoming.filter((m) => m.type === "reaction" && Date.now() - new Date(m.createdAt).getTime() < 8000);
    if (fresh.length === 0) return;
    const items = fresh.map((m) => ({ id: m.id + Math.random(), emoji: m.body, x: 10 + Math.random() * 80 }));
    setFloating((f) => [...f, ...items]);
    setTimeout(() => setFloating((f) => f.filter((x) => !items.some((i) => i.id === x.id))), 2700);
  }, []);

  const mergeMessages = useCallback(
    (incoming: MessageView[]) => {
      if (incoming.length === 0) return;
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const fresh = incoming.filter((m) => !ids.has(m.id));
        if (fresh.length === 0) return prev;
        // Drop optimistic placeholders that now have a confirmed counterpart.
        const withoutTemps = prev.filter((m) => !(m.id < 0 && fresh.some((f) => f.user?.id === m.user?.id && f.body === m.body)));
        return [...withoutTemps, ...fresh].sort((a, b) => (a.id < 0 ? 1 : b.id < 0 ? -1 : a.id - b.id));
      });
      spawnReactions(incoming.filter((m) => m.user?.id !== user.id));
    },
    [spawnReactions, user.id],
  );

  // Poll the room state every 2 seconds (also acts as the presence heartbeat).
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const lastId = messages.reduce((max, m) => (m.id > max ? m.id : max), 0);
        const res = await fetch(`/api/parties/${party.code}/state?after=${lastId}`, { cache: "no-store" });
        if (res.status === 404) {
          toast({ tone: "info", title: "This party was deleted by the host" });
          router.push("/parties");
          return;
        }
        if (!res.ok) throw new Error("poll failed");
        const data = (await res.json()) as StateResponse;
        if (cancelled) return;
        setServerOffset(new Date(data.serverTime).getTime() - Date.now());
        setParticipants(data.participants);
        setIsMember(data.me.isMember);
        setParty((prev) => {
          const recentlyControlled = Date.now() - lastControlAt.current < 2500;
          return recentlyControlled
            ? { ...data.party, playbackState: prev.playbackState, playbackPosition: prev.playbackPosition, playbackUpdatedAt: prev.playbackUpdatedAt, episode: prev.episode }
            : data.party;
        });
        mergeMessages(data.messages);
      } catch {
        /* transient network error — try again on the next tick */
      } finally {
        if (!cancelled) timer = setTimeout(tick, 2000);
      }
    };
    timer = setTimeout(tick, 2000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [party.code, messages.length > 0 ? messages[messages.length - 1].id : 0]);

  const control = useCallback(
    async (c: PlaybackControl) => {
      lastControlAt.current = Date.now();
      setParty((prev) => {
        const max = prev.anime.episodeLength * 60;
        const currentPos = computePosition(prev, serverOffset, Date.now(), max);
        const next = { ...prev };
        if (c.episode != null && c.episode !== prev.episode) {
          next.episode = c.episode;
          next.playbackPosition = 0;
          next.playbackState = "paused";
        } else {
          next.playbackPosition = c.position ?? currentPos;
          next.playbackState = c.state ?? prev.playbackState;
        }
        next.playbackUpdatedAt = new Date(Date.now() + serverOffset).toISOString();
        return next;
      });
      try {
        const res = await fetch(`/api/parties/${party.code}/playback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(c),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          toast({ tone: "error", title: err.error ?? "Playback update failed" });
          return;
        }
        const data = (await res.json()) as Pick<SerializedParty, "playbackState" | "playbackPosition" | "playbackUpdatedAt" | "episode">;
        setParty((prev) => ({ ...prev, ...data }));
      } catch {
        toast({ tone: "error", title: "Lost connection while syncing playback" });
      }
    },
    [party.code, serverOffset, toast],
  );

  const send = async (body: string, type: "chat" | "reaction") => {
    const temp: MessageView = {
      id: -Date.now(),
      type,
      body,
      createdAt: new Date().toISOString(),
      user: { id: user.id, username: user.username, displayName: user.displayName, avatarColor: user.avatarColor },
    };
    setMessages((prev) => [...prev, temp]);
    if (type === "reaction") spawnReactions([temp]);
    try {
      const res = await fetch(`/api/parties/${party.code}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, type }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "Failed" }))).error);
      const data = (await res.json()) as { message: MessageView };
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev.filter((m) => m.id !== temp.id);
        return prev.map((m) => (m.id === temp.id ? data.message : m));
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      toast({ tone: "error", title: err instanceof Error ? err.message : "Message not sent" });
    }
  };

  const join = async () => {
    setJoining(true);
    try {
      const res = await fetch(`/api/parties/${party.code}/join`, { method: "POST" });
      const data = (await res.json()) as { error?: string; participants?: ParticipantView[] };
      if (!res.ok) {
        toast({ tone: "error", title: data.error ?? "Could not join" });
        return;
      }
      setIsMember(true);
      if (data.participants) setParticipants(data.participants);
      toast({ tone: "success", title: "You're in!", description: "Playback is now synced with the host." });
    } finally {
      setJoining(false);
    }
  };

  const leave = async () => {
    await fetch(`/api/parties/${party.code}/leave`, { method: "POST" });
    router.push("/parties");
    router.refresh();
  };

  const copy = async (kind: "code" | "link") => {
    const text = kind === "code" ? party.code : `${window.location.origin}/parties/${party.code}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ tone: "info", title: kind === "code" ? `Room code: ${party.code}` : text });
    }
  };

  const removeParticipant = (userId: number) => {
    const prev = participants;
    setParticipants((p) => p.filter((x) => x.userId !== userId));
    startLifecycle(async () => {
      const res = await removeParticipantAction(party.id, userId);
      if (!res.ok) {
        setParticipants(prev);
        toast({ tone: "error", title: res.error });
      }
    });
  };

  const joinButton =
    party.status !== "ended" && !isMember ? (
      <Button size="lg" onClick={join} loading={joining} disabled={seatsFull && !isHost}>
        <DoorOpen className="h-4 w-4" />
        {seatsFull && !isHost ? "Room is full" : party.status === "scheduled" ? "RSVP & enter lobby" : "Join the room"}
      </Button>
    ) : null;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:h-[calc(100vh-4rem)] lg:flex-row">
      {/* Left column */}
      <div className="scrollbar-thin flex min-w-0 flex-1 flex-col lg:overflow-y-auto">
        <div className="flex items-center gap-3 px-4 pt-4 sm:px-6">
          <Link href="/parties" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted hover:text-fg" aria-label="Back to parties">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold">{party.name}</h1>
              <Badge tone={partyTone(party.status)}>
                {party.status === "live" && <LiveDot />}
                {party.status === "live" ? "Live" : party.status === "scheduled" ? "Scheduled" : "Ended"}
              </Badge>
              {party.isPrivate && (
                <Badge>
                  <Lock className="h-3 w-3" /> Private
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted" suppressHydrationWarning>
              Hosted by {party.host.displayName} · <Users className="inline h-3 w-3" /> {participants.length}/{party.maxParticipants}
              {party.status === "scheduled" && party.scheduledFor && (
                <>
                  {" "}
                  · <CalendarClock className="inline h-3 w-3" /> {formatDateTime(party.scheduledFor)}
                </>
              )}
            </p>
          </div>
          <div className="hidden items-center gap-1 sm:flex">
            <button onClick={() => copy("code")} className="flex h-9 items-center gap-2 rounded-xl border border-border px-3 font-mono text-xs tracking-[0.2em] text-fg hover:bg-surface-2" title="Copy room code">
              {party.code}
              {copied === "code" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-muted" />}
            </button>
            <button onClick={() => copy("link")} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted hover:bg-surface-2 hover:text-fg" title="Copy invite link" aria-label="Copy invite link">
              {copied === "link" ? <Check className="h-4 w-4 text-success" /> : <Link2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="mt-4 lg:px-6">
          <PartyPlayer party={party} serverOffset={serverOffset} isHost={isHost} isMember={isMember} onControl={control} floating={floating}>
            {party.status === "scheduled" && isHost ? (
              <Button
                size="lg"
                loading={lifecyclePending}
                onClick={() =>
                  startLifecycle(async () => {
                    const res = await startPartyAction(party.id);
                    if (!res.ok) toast({ tone: "error", title: res.error });
                    else {
                      setParty((p) => ({ ...p, status: "live", playbackState: "paused", playbackPosition: 0 }));
                      toast({ tone: "success", title: "You're live!" });
                    }
                  })
                }
              >
                <Play className="h-4 w-4" /> Go live now
              </Button>
            ) : party.status === "ended" && isHost ? (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Delete party
              </Button>
            ) : (
              joinButton
            )}
          </PartyPlayer>
        </div>

        {/* Info strip */}
        <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/anime/${party.anime.slug}`} className="text-base font-semibold hover:text-violet-200">
                {party.anime.title}
              </Link>
              <p className="text-xs text-muted">
                {party.anime.titleJapanese && <span>{party.anime.titleJapanese} · </span>}
                {party.anime.studio} · {party.anime.year} · Episode {party.episode} of {party.anime.episodes}
              </p>
              {party.description && <p className="mt-2 max-w-2xl text-sm text-muted">{party.description}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => copy("code")} className="flex h-9 items-center gap-2 rounded-xl border border-border px-3 font-mono text-xs tracking-[0.2em] sm:hidden">
                {party.code} {copied === "code" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-muted" />}
              </button>
              {isHost && party.status !== "ended" && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
                    <Settings2 className="h-4 w-4" /> Settings
                  </Button>
                  {party.status === "live" && (
                    <Button variant="danger" size="sm" onClick={() => setConfirmEnd(true)}>
                      <Square className="h-3.5 w-3.5" /> End party
                    </Button>
                  )}
                </>
              )}
              {isHost && party.status === "ended" && (
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              )}
              {!isHost && isMember && party.status !== "ended" && (
                <Button variant="outline" size="sm" onClick={leave}>
                  <DoorOpen className="h-4 w-4" /> Leave room
                </Button>
              )}
              {!isMember && party.status !== "ended" && (
                <Button size="sm" onClick={join} loading={joining} disabled={seatsFull && !isHost}>
                  <DoorOpen className="h-4 w-4" /> {seatsFull && !isHost ? "Full" : "Join"}
                </Button>
              )}
            </div>
          </div>
          {isHost && party.status === "live" && (
            <p className="text-xs text-muted">
              Host tips: <kbd className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px]">Space</kbd> play/pause · <kbd className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px]">←</kbd>/<kbd className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px]">→</kbd> seek 10s. Everyone in the room follows your playback.
            </p>
          )}
        </div>
      </div>

      {/* Right column: chat */}
      <aside className={cn("flex h-[520px] shrink-0 flex-col border-t border-border bg-surface/60 lg:h-auto lg:w-[360px] lg:border-l lg:border-t-0 xl:w-[400px]")}>
        <PartyChat
          messages={messages}
          participants={participants}
          meId={user.id}
          isHost={isHost}
          canChat={canChat}
          maxParticipants={party.maxParticipants}
          onSend={send}
          onRemove={removeParticipant}
          disabledReason={party.status === "ended" ? "This party has ended" : "Join the room to chat"}
        />
      </aside>

      {/* Host modals */}
      {isHost && (
        <PartySettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          party={party}
          onSaved={() => {
            setSettingsOpen(false);
            lastControlAt.current = 0;
            router.refresh();
            toast({ tone: "success", title: "Party updated" });
          }}
        />
      )}
      <Modal open={confirmEnd} onClose={() => setConfirmEnd(false)} title="End this party?" description="Playback stops for everyone and the room closes. The chat log stays visible.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
            Keep watching
          </Button>
          <Button
            variant="danger"
            loading={lifecyclePending}
            onClick={() =>
              startLifecycle(async () => {
                const res = await endPartyAction(party.id);
                if (!res.ok) toast({ tone: "error", title: res.error });
                else {
                  setParty((p) => ({ ...p, status: "ended", playbackState: "paused" }));
                  setConfirmEnd(false);
                }
              })
            }
          >
            End party
          </Button>
        </div>
      </Modal>
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this party?" description="The room, its chat history, and participant list will be permanently removed.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={lifecyclePending}
            onClick={() =>
              startLifecycle(async () => {
                const res = await deletePartyAction(party.id);
                if (res && !res.ok) toast({ tone: "error", title: res.error });
              })
            }
          >
            Delete permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function PartySettingsModal({ open, onClose, party, onSaved }: { open: boolean; onClose: () => void; party: SerializedParty; onSaved: () => void }) {
  const [state, formAction, pending] = useActionState<PartyFormState, FormData>(updatePartyAction.bind(null, party.id), null);
  const [size, setSize] = useState(party.maxParticipants);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onSaved();
    wasPending.current = pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, state]);

  const scheduledDefault = party.scheduledFor
    ? (() => {
        const d = new Date(party.scheduledFor);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      })()
    : "";

  return (
    <Modal open={open} onClose={onClose} title="Party settings" description="Changes apply to everyone in the room immediately.">
      <form action={formAction} className="space-y-4">
        <Field label="Name">
          <Input name="name" defaultValue={party.name} required minLength={3} />
        </Field>
        <Field label="Description" hint="optional">
          <Textarea name="description" defaultValue={party.description} className="min-h-[72px]" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Episode" hint={`of ${party.anime.episodes}`}>
            <Input name="episode" type="number" min={1} max={party.anime.episodes} defaultValue={party.episode} required />
          </Field>
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted">
              <span>Seats</span>
              <span>{size}</span>
            </label>
            <input type="range" name="maxParticipants" min={2} max={MAX_PARTY_SIZE} value={size} onChange={(e) => setSize(Number(e.target.value))} className="mt-2 w-full" />
          </div>
        </div>
        {party.status === "scheduled" && (
          <Field label="Scheduled for">
            <Input name="scheduledFor" type="datetime-local" defaultValue={scheduledDefault} />
            <input type="hidden" name="startMode" value="later" />
          </Field>
        )}
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" name="isPrivate" defaultChecked={party.isPrivate} className="h-4 w-4 accent-violet-500" />
          Private room (hidden from the public list)
        </label>
        <FormError message={state?.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
