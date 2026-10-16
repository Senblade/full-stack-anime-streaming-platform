"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteAnimeAction } from "@/actions/anime";
import { Button, buttonVariants } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export function AnimeAdminActions({ animeId, slug, title }: { animeId: number; slug: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <>
      <Link href={`/anime/${slug}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Link>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Delete ${title}?`} description="This removes the entry, every library record, review, and watch party attached to it. This cannot be undone.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteAnimeAction(animeId);
                if (res && "error" in res) toast({ tone: "error", title: res.error });
              })
            }
          >
            Delete permanently
          </Button>
        </div>
      </Modal>
    </>
  );
}
