/**
 * Seed pricing v1, the first administrator (ADMIN_EMAIL / ADMIN_PASSWORD)
 * and, unless SEED_PORTFOLIO=false, the starter portfolio of project photos.
 * Idempotent: only creates what is missing.
 *   npm run db:seed
 */
async function main() {
  const { getDb, closeDb } = await import("../src/lib/db");
  const { seedEssentials } = await import("../src/lib/db/seed");
  await seedEssentials(await getDb());
  await closeDb();
  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
