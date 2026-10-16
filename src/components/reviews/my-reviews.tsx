"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { AlertTriangle, MessageSquareText, Pencil, Trash2 } from "lucide-react";
import { deleteReviewAction, updateReviewAction, type ReviewInput } from "@/actions/reviews";
import type { getUserReviews } from "@/lib/queries";
import { cn, timeAgo } from "@/lib/utils";
import { AnimeCover } from "@/components/anime/anime-cover";
import { ScoreStars } from "@/components/reviews/review-section";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormError, Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

type MyReview = Awaited<ReturnType<typeof getUserReviews>>[number];
type Action = { type: "update"; review: MyReview } | { type: "delete"; id: number };

export function MyReviews({ reviews }: { reviews: MyReview[] }) {
  const [list, apply] = useOptimistic<MyReview[], Action>(reviews, (state, action) => {
    if (action.type === "update") return state.map((r) => (r.id === action.review.id ? action.review : r));
    return state.filter((r) => r.id !== action.id);
  });
  const [editing, setEditing] = useState<MyReview | null>(null);
  const [deleting, setDeleting] = useState<MyReview | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const save = (input: ReviewInput) =>
    new Promise<string | null>((resolve) => {
      if (!editing) return resolve("Nothing to edit");
      const target = editing;
      startTransition(async () => {
        apply({ type: "update", review: { ...target, ...input, updatedAt: new Date() } });
        const res = await updateReviewAction(target.id, input);
        if (!res.ok) {
          toast({ tone: "error", title: res.error });
          resolve(res.error);
          return;
        }
        toast({ tone: "success", title: "Review updated" });
        resolve(null);
      });
    });

  const remove = (r: MyReview) =>
    startTransition(async () => {
      apply({ type: "delete", id: r.id });
      setDeleting(null);
      const res = await deleteReviewAction(r.id);
      if (!res.ok) toast({ tone: "error", title: res.error });
      else toast({ tone: "info", title: "Review deleted" });
    });

  if (list.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquareText className="h-6 w-6" />}
        title="You haven't written any reviews"
        description="Open any anime page and share what you thought. Your reviews show up on the title and in the community feed."
        action={<ButtonLink href="/anime">Find something to review</ButtonLink>}
      />
    );
  }

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((r) => (
          <article key={r.id} className={cn("flex animate-fade-up gap-4 rounded-2xl border border-border bg-surface p-4", pending && "opacity-90")}>
            <Link href={`/anime/${r.anime.slug}`} className="w-16 shrink-0">
              <AnimeCover anime={r.anime} showTitle={false} rounded="rounded-xl" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/anime/${r.anime.slug}`} className="line-clamp-1 text-xs text-muted hover:text-fg">
                    {r.anime.title}
                  </Link>
                  <h3 className="mt-0.5 line-clamp-1 text-sm font-semibold">{r.title}</h3>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setEditing(r)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleting(r)} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <ScoreStars value={r.rating} />
                <span className="font-semibold text-amber-300">{r.rating}/10</span>
                <span suppressHydrationWarning>· {timeAgo(r.createdAt)}</span>
                {r.containsSpoilers && (
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <AlertTriangle className="h-3 w-3" /> spoilers
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{r.body}</p>
            </div>
          </article>
        ))}
      </div>

      <EditModal key={editing?.id ?? "none"} review={editing} onClose={() => setEditing(null)} onSave={save} />

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete this review?" description="This can't be undone.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => deleting && remove(deleting)}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}

function EditModal({ review, onClose, onSave }: { review: MyReview | null; onClose: () => void; onSave: (input: ReviewInput) => Promise<string | null> }) {
  const [rating, setRating] = useState(review?.rating ?? 8);
  const [title, setTitle] = useState(review?.title ?? "");
  const [body, setBody] = useState(review?.body ?? "");
  const [spoilers, setSpoilers] = useState(review?.containsSpoilers ?? false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal open={Boolean(review)} onClose={onClose} title="Edit review">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          const err = await onSave({ rating, title, body, containsSpoilers: spoilers });
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
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Review">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[140px]" required />
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={spoilers} onChange={(e) => setSpoilers(e.target.checked)} className="h-4 w-4 accent-violet-500" />
          Contains spoilers
        </label>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
