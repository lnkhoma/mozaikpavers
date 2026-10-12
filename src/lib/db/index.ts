import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { logger } from "@/lib/logger";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Anything that can run queries: the db itself or an open transaction. */
export type Executor = Database | Tx;

export { schema };

interface DbState {
  promise?: Promise<Database>;
  close?: () => Promise<void>;
}

// Survive Next.js hot reloads in development.
const globalState = globalThis as unknown as { __mozaikDb?: DbState };
const state: DbState = (globalState.__mozaikDb ??= {});

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

/**
 * DATABASE_URL selects the driver:
 *   postgres://… / postgresql://…   → PostgreSQL / Supabase (production)
 *   pglite:./.data/pglite (default) → embedded PostgreSQL for local development
 *   pglite:memory                   → throwaway in-memory database (tests)
 */
function databaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || "pglite:./.data/pglite";
}

export function isEmbeddedDatabase(): boolean {
  return databaseUrl().startsWith("pglite:");
}

async function connect(): Promise<Database> {
  const url = databaseUrl();

  if (url.startsWith("pglite:")) {
    const target = url.slice("pglite:".length);
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const client =
      target === "memory" ? new PGlite() : new PGlite(path.resolve(/*turbopackIgnore: true*/ process.cwd(), target));
    const db = drizzle({ client, schema });
    // The embedded database is always migrated and seeded on first use.
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    state.close = () => client.close();
    const typed = db as unknown as Database;
    const { seedEssentials } = await import("./seed");
    await seedEssentials(typed);
    return typed;
  }

  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const client = postgres(url, {
    max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    connect_timeout: 10, // seconds; fail fast so pages can fall back
    prepare: process.env.DATABASE_PREPARE !== "false", // set false behind PgBouncer / Supabase pooler
    ssl: process.env.DATABASE_SSL === "false" ? false : url.includes("localhost") ? false : "require",
  });
  const db = drizzle({ client, schema }) as unknown as Database;
  state.close = () => client.end();

  if (process.env.DB_AUTO_MIGRATE === "true") {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(db as never, { migrationsFolder: MIGRATIONS_FOLDER });
    const { seedEssentials } = await import("./seed");
    await seedEssentials(db);
  }
  return db;
}

export function getDb(): Promise<Database> {
  if (!state.promise) {
    state.promise = connect().catch((error) => {
      state.promise = undefined;
      logger.error("database.connect_failed", { error });
      throw error;
    });
  }
  return state.promise;
}

export async function closeDb(): Promise<void> {
  await state.close?.();
  state.promise = undefined;
  state.close = undefined;
}
