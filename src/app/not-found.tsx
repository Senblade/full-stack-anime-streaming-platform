import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/20 to-brand-2/20 text-violet-300 ring-1 ring-brand/30">
        <Compass className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">This page wandered off into another world. Let&apos;s get you back.</p>
      <Link href="/dashboard" className={buttonVariants({ className: "mt-6" })}>
        Go to dashboard
      </Link>
    </div>
  );
}
