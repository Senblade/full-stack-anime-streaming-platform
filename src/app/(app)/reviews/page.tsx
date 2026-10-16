import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getUserReviews } from "@/lib/queries";
import { MyReviews } from "@/components/reviews/my-reviews";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "My reviews" };

export default async function ReviewsPage() {
  const user = await requireUser();
  const reviews = await getUserReviews(user.id);
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div>
      <PageHeader title="My reviews" description={avg ? `${reviews.length} reviews · average score ${avg}/10. Edit or delete any of them here.` : "Your published reviews, all in one place."} />
      <MyReviews reviews={reviews} />
    </div>
  );
}
