"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, MessageCircle, SendHorizonal, UserMinus, Users } from "lucide-react";
import type { MessageView, ParticipantView } from "@/lib/parties";
import { REACTIONS } from "@/lib/constants";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

export function PartyChat({
  messages,
  participants,
  meId,
  isHost,
  canChat,
  maxParticipants,
  onSend,
  onRemove,
  disabledReason,
}: {
  messages: MessageView[];
  participants: ParticipantView[];
  meId: number;
  isHost: boolean;
  canChat: boolean;
  maxParticipants: number;
  onSend: (body: string, type: "chat" | "reaction") => void;
  onRemove: (userId: number) => void;
  disabledReason?: string;
}) {
  const [tab, setTab] = useState<"chat" | "people">("chat");
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, tab]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    onSend(body, "chat");
    setDraft("");
    stickToBottom.current = true;
  };

  const online = participants.filter((p) => p.online).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex border-b border-border">
        <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
          <MessageCircle className="h-4 w-4" /> Chat
        </TabButton>
        <TabButton active={tab === "people"} onClick={() => setTab("people")}>
          <Users className="h-4 w-4" /> People
          <span className="rounded-full bg-surface-3 px-1.5 text-[10px] tabular-nums text-muted">
            {participants.length}/{maxParticipants}
          </span>
        </TabButton>
      </div>

      {tab === "chat" ? (
        <>
          <div ref={listRef} onScroll={onScroll} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && <p className="py-10 text-center text-sm text-muted">No messages yet. Say hello!</p>}
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const grouped = prev && prev.type === "chat" && m.type === "chat" && prev.user?.id === m.user?.id;
              if (m.type === "system") {
                return (
                  <p key={m.id} className="text-center text-[11px] text-muted">
                    {m.body}
                  </p>
                );
              }
              if (m.type === "reaction") {
                return (
                  <div key={m.id} className="flex items-center gap-2 text-xs text-muted">
                    <span className="text-lg">{m.body}</span>
                    <span>{m.user?.id === meId ? "You" : m.user?.displayName ?? "Someone"} reacted</span>
                  </div>
                );
              }
              const mine = m.user?.id === meId;
              return (
                <div key={m.id} className={cn("flex gap-2.5 animate-fade-up", grouped && "-mt-1.5", m.id < 0 && "opacity-60")}>
                  <div className="w-7 shrink-0">{!grouped && m.user && <Avatar name={m.user.displayName} color={m.user.avatarColor} size="xs" />}</div>
                  <div className="min-w-0 flex-1">
                    {!grouped && (
                      <div className="flex items-baseline gap-2">
                        <span className={cn("text-xs font-semibold", mine ? "text-violet-200" : "text-fg")}>{mine ? "You" : m.user?.displayName ?? "Unknown"}</span>
                        <span className="text-[10px] text-muted" suppressHydrationWarning>{timeAgo(m.createdAt)}</span>
                      </div>
                    )}
                    <p className="break-words text-sm leading-relaxed text-fg/90">{m.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border p-3">
            <div className="mb-2 flex gap-1">
              {REACTIONS.map((r) => (
                <button
                  key={r}
                  disabled={!canChat}
                  onClick={() => onSend(r, "reaction")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:scale-110 hover:bg-surface-2 disabled:opacity-40"
                  aria-label={`React ${r}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!canChat}
                placeholder={canChat ? "Send a message…" : disabledReason ?? "Join to chat"}
                maxLength={500}
                className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface-2/70 px-3.5 text-sm placeholder:text-muted/70 focus:border-brand/70 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
              />
              <button type="submit" disabled={!canChat || !draft.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-brand to-brand-2 text-white transition hover:brightness-110 disabled:opacity-40" aria-label="Send">
                <SendHorizonal className="h-4 w-4" />
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-muted">
            <span>
              {online} online · {participants.length} of {maxParticipants} seats
            </span>
          </div>
          <div className="mb-4 flex gap-1">
            {Array.from({ length: maxParticipants }).map((_, i) => (
              <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < participants.length ? "bg-gradient-to-r from-brand to-brand-2" : "bg-surface-3")} />
            ))}
          </div>
          <ul className="space-y-1">
            {participants.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                <div className="relative">
                  <Avatar name={p.displayName} color={p.avatarColor} size="sm" />
                  <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface", p.online ? "bg-success" : "bg-muted/50")} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {p.displayName}
                    {p.userId === meId && <span className="text-xs text-muted">(you)</span>}
                    {p.isHost && <Crown className="h-3.5 w-3.5 text-amber-300" />}
                  </p>
                  <p className="truncate text-xs text-muted" suppressHydrationWarning>{p.online ? "Watching now" : `Last seen ${timeAgo(p.lastSeenAt)}`}</p>
                </div>
                {isHost && !p.isHost && (
                  <button onClick={() => onRemove(p.userId)} className="rounded-lg p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger" aria-label={`Remove ${p.displayName}`} title="Remove from room">
                    <UserMinus className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {participants.length < maxParticipants && (
            <p className="mt-4 rounded-xl border border-dashed border-border-strong p-3 text-center text-xs text-muted">
              {maxParticipants - participants.length} open {maxParticipants - participants.length === 1 ? "seat" : "seats"} — share the room code to invite friends.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("relative flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition", active ? "text-fg" : "text-muted hover:text-fg")}>
      {children}
      {active && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-brand to-brand-2" />}
    </button>
  );
}
