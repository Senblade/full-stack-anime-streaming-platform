"use client";

import { useOptimistic, useState, useTransition } from "react";
import { AlertTriangle, MessageSquarePlus, Pencil, Star, Trash2 } from "lucide-react";
import { createReviewAction, deleteReviewAction, updateReviewAction, type ReviewInput } from "@/actions/reviews";
import type { ReviewWithUser } from "@/lib/queries";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormError, Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

type Me = { id: number; username: string; displayName: string; avatarColor: string; role: string };
type OptimisticAction = { type: "add"; review: ReviewWithUser } | { type: "update"; review: ReviewWithUser } | { type: "delete"; id: number };

export function ReviewSection({ animeId, reviews, me }: { animeId: number; reviews: ReviewWithUser[]; me: Me }) {
  const [optimisticReviews, apply] = useOptimistic<ReviewWithUser[], OptimisticAction>(reviews, (state, action) => {
    if (action.type === "add") return [action.review, ...state];
    if (action.type === "update") return state.map((r) => (r.id === action.review.id ? action.review : r));
    return state.filter((r) => r.id !== action.id);
  });
  const [editing, setEditing] = useState<ReviewWithUser | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const myExisting = optimisticReviews.find((r) => r.user.id === me.id);

  const submit = (input: ReviewInput, existing?: ReviewWithUser | null) => {
    return new Promise<string | null>((resolve) => {
      startTransition(async () => {
        if (existing) {
          apply({ type: "update", review: { ...existing, ...input, updatedAt: new Date() } });
          const res = await updateReviewAction(existing.id, input);
          if (!res.ok) {
            toast({ tone: "error", title: res.error });
            resolve(res.error);
            return;
          }
          toast({ tone: "success", title: "Review updated" });
        } else {
          apply({
            type: "add",
            review: { id: -Date.now(), animeId, ...input, createdAt: new Date(), updatedAt: new Date(), user: { id: me.id, username: me.username, displayName: me.displayName, avatarColor: me.avatarColor } },
          });
          const res = await createReviewAction(animeId, input);
          if (!res.ok) {
            toast({ tone: "error", title: res.error });
            resolve(res.error);
            return;
          }
          toast({ tone: "success", title: "Review published" });
        }
        resolve(null);
      });
    });
  };

  const remove = (review: ReviewWithUser) => {
    startTransition(async () => {
      apply({ type: "delete", id: review.id });
      const res = await deleteReviewAction(review.id);
      if (!res.ok) toast({ tone: "error", title: res.error });
      else toast({ tone: "info", title: "Review deleted" });
    });
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Reviews</h2>
          <p className="text-sm text-muted">{optimisticReviews.length} from the community</p>
        </div>
        {!myExisting && (
          <Button size="sm" onClick={() => setComposerOpen(true)}>
            <MessageSquarePlus className="h-4 w-4" /> Write a review
          </Button>
        )}
      </div>

      {optimisticReviews.length === 0 ? (
        <EmptyState
          compact
          icon={<MessageSquarePlus className="h-6 w-6" />}
          title="No reviews yet"
          description="Be the first to share what you thought. Spoiler tags are available."
          action={
            <Button size="sm" onClick={() => setComposerOpen(true)}>
              Write the first review
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {optimisticReviews.map((r) => (
            <ReviewCard key={r.id} review={r} canManage={r.user.id === me.id || me.role === "admin"} onEdit={() => setEditing(r)} onDelete={() => remove(r)} pending={pending && r.id < 0} />
          ))}
        </div>
      )}

      <ReviewComposer open={composerOpen || Boolean(editing)} onClose={() => { setComposerOpen(false); setEditing(null); }} existing={editing} onSubmit={(input) => submit(input, editing)} />
    </section>
  );
}

function ReviewCard({ review, canManage, onEdit, onDelete, pending }: { review: ReviewWithUser; canManage: boolean; onEdit: () => void; onDelete: () => void; pending?: boolean }) {
  const [revealed, setRevealed] = useState(!review.containsSpoilers);
  return (
    <article className={cn("animate-fade-up rounded-2xl border border-border bg-surface p-5 transition", pending && "opacity-60")}>
      <div className="flex items-start gap-3">
        <Avatar name={review.user.displayName} color={review.user.avatarColor} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{review.user.displayName}</span>
            <span className="text-xs text-muted">@{review.user.username}</span>
            <span className="text-xs text-muted" suppressHydrationWarning>· {timeAgo(review.createdAt)}</span>
            {review.containsSpoilers && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                <AlertTriangle className="h-3 w-3" /> Spoilers
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <ScoreStars value={review.rating} />
            <span className="text-xs font-semibold text-amber-300">{review.rating}/10</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold">{review.title}</h3>
          {revealed ? (
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">{review.body}</p>
          ) : (
            <button onClick={() => setRevealed(true)} className="mt-2 rounded-xl border border-dashed border-warning/40 bg-warning/5 px-4 py-3 text-xs text-amber-200 hover:bg-warning/10">
              This review contains spoilers. Click to reveal.
            </button>
          )}
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-1">
            <button onClick={onEdit} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Edit review">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={onDelete} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Delete review">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function ScoreStars({ value, max = 10 }: { value: number; max?: number }) {
  const stars = Math.round((value / max) * 5);
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of ${max}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn("h-3.5 w-3.5", i < stars ? "fill-amber-400 text-amber-400" : "text-border-strong")} />
      ))}
    </span>
  );
}

function ReviewComposer({ open, onClose, existing, onSubmit }: { open: boolean; onClose: () => void; existing: ReviewWithUser | null; onSubmit: (input: ReviewInput) => Promise<string | null> }) {
  const [rating, setRating] = useState(existing?.rating ?? 8);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [spoilers, setSpoilers] = useState(existing?.containsSpoilers ?? false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastKey, setLastKey] = useState<string>("");

  // Reset form fields whenever we open for a different review.
  const key = `${open}-${existing?.id ?? "new"}`;
  if (key !== lastKey) {
    setLastKey(key);
    setRating(existing?.rating ?? 8);
    setTitle(existing?.title ?? "");
    setBody(existing?.body ?? "");
    setSpoilers(existing?.containsSpoilers ?? false);
    setError(null);
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? "Edit your review" : "Write a review"} description="Share your honest take. Mark spoilers so others can choose.">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          const err = await onSubmit({ rating, title, body, containsSpoilers: spoilers });
          setSubmitting(false);
          if (err) setError(err);
          else onClose();
        }}
      >
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted">
            <span>Rating</span>
            <span className="text-amber-300">{rating}/10</span>
          </label>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className={cn("h-9 rounded-lg border text-xs font-semibold transition", n <= rating ? "border-amber-400/50 bg-amber-400/20 text-amber-200" : "border-border bg-surface-2 text-muted hover:text-amber-200")}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sum it up in a sentence" required />
        </Field>
        <Field label="Review" hint={`${body.length} chars`}>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What worked? What didn't? Who should watch it?" className="min-h-[140px]" required />
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={spoilers} onChange={(e) => setSpoilers(e.target.checked)} className="h-4 w-4 rounded border-border accent-violet-500" />
          Contains spoilers
        </label>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {existing ? "Save changes" : "Publish review"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
