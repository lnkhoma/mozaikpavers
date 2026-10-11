/**
 * Apply database migrations.
 *   npm run db:migrate
 * With DATABASE_URL unset this migrates the embedded development database.
 */
import path from "node:path";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  const migrationsFolder = path.join(process.cwd(), "drizzle");

  if (!url || url.startsWith("pglite:")) {
    // The embedded database migrates itself on connect.
    const { getDb, closeDb } = await import("../src/lib/db");
    await getDb();
    await closeDb();
    console.log("Embedded database migrated.");
    return;
  }

  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const client = postgres(url, { max: 1, ssl: process.env.DATABASE_SSL === "false" ? false : url.includes("localhost") ? false : "require" });
  await migrate(drizzle(client), { migrationsFolder });
  await client.end();
  console.log("PostgreSQL migrated.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
