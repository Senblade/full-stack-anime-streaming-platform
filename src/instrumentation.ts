export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureDatabase } = await import("@/db/bootstrap");
    try {
      await ensureDatabase();
    } catch (err) {
      console.error("[anisync] bootstrap error (continuing)", err);
    }
  }
}
