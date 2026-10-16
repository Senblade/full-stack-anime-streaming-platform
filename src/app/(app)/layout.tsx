import type { ReactNode } from "react";
import { Suspense } from "react";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { watchParties } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [live] = await db.select({ value: count() }).from(watchParties).where(eq(watchParties.status, "live"));

  return (
    <Suspense fallback={null}>
      <AppShell user={user} liveCount={Number(live?.value ?? 0)}>
        {children}
      </AppShell>
    </Suspense>
  );
}
