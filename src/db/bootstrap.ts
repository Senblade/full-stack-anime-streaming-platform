import path from "path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/db";

const globalForBootstrap = globalThis as typeof globalThis & {
  __anisyncBootstrap?: Promise<void>;
};

async function tableExists(name: string) {
  const result = await db.execute(
    sql`select 1 from information_schema.tables where table_schema = 'public' and table_name = ${name} limit 1`,
  );
  return result.rows.length > 0;
}

async function run() {
  // 1. Make sure the schema exists. If the platform already pushed the schema
  //    with drizzle-kit we skip migrations entirely.
  const hasSchema = await tableExists("anime");
  if (!hasSchema) {
    const migrationsFolder = path.join(process.cwd(), "drizzle");
    await migrate(db, { migrationsFolder });
    console.log("[anisync] database schema created");
  }

  // 2. Seed demo data on first boot so the app feels alive immediately.
  const countResult = await db.execute(sql`select count(*)::int as count from anime`);
  const count = Number((countResult.rows[0] as { count: number } | undefined)?.count ?? 0);
  if (count === 0) {
    const { seedDatabase } = await import("@/db/seed");
    const summary = await seedDatabase();
    console.log(`[anisync] seeded ${summary.anime} anime and ${summary.users} users`);
  }
}

/** Idempotent: safe to call many times, runs at most once per process. */
export function ensureDatabase() {
  if (!globalForBootstrap.__anisyncBootstrap) {
    globalForBootstrap.__anisyncBootstrap = run().catch((err) => {
      console.error("[anisync] database bootstrap failed", err);
      globalForBootstrap.__anisyncBootstrap = undefined;
      throw err;
    });
  }
  return globalForBootstrap.__anisyncBootstrap;
}
