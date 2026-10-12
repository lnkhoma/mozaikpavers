import { access, constants, mkdir } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { company } from "@/config/company";
import { getDb, isEmbeddedDatabase } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";

export const dynamic = "force-dynamic";

/** Never echo connection strings, keys or long stack traces. */
function describe(error: unknown): { name: string; code?: string; message: string } {
  const e = error as { name?: string; code?: string; message?: string; cause?: { code?: string; message?: string } };
  const message = String(e?.message ?? error)
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, "[address hidden]")
    .replace(/\s+/g, " ")
    .slice(0, 240);
  return { name: e?.name ?? "Error", code: e?.code ?? e?.cause?.code, message };
}

async function canWrite(dir: string): Promise<boolean> {
  try {
    await mkdir(dir, { recursive: true });
    await access(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/health — what is working and what is not, for setting up hosting.
 * Reports only whether each setting is present, never its value.
 */
export async function GET(request: Request) {
  const rl = rateLimit(`health:${clientIp(request.headers)}`, LIMITS.analytics.limit, LIMITS.analytics.windowMs);
  if (!rl.ok) return NextResponse.json({ status: "busy" }, { status: 429 });

  const embedded = isEmbeddedDatabase();
  const database: Record<string, unknown> = {
    type: embedded ? "embedded (development database, no DATABASE_URL set)" : "postgresql",
  };
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    database.ok = true;
  } catch (error) {
    database.ok = false;
    database.error = describe(error);
  }

  const set = (...names: string[]) => names.some((n) => !!process.env[n]?.trim());
  const cwd = process.cwd();

  const body = {
    status: database.ok ? "ok" : "database_unavailable",
    time: new Date().toISOString(),
    database,
    files: {
      migrationsFolderFound: await exists(path.join(cwd, "drizzle", "meta", "_journal.json")),
      dataFolderWritable: embedded ? await canWrite(path.join(cwd, ".data")) : "not needed",
    },
    settings: {
      siteUrl: company.siteUrl,
      siteUrlIsLocalhost: company.siteUrl.includes("localhost"),
      DATABASE_URL: set("DATABASE_URL"),
      AUTH_SECRET: set("AUTH_SECRET"),
      ADMIN_EMAIL: set("ADMIN_EMAIL"),
      ADMIN_PASSWORD: set("ADMIN_PASSWORD"),
      email: { transport: process.env.EMAIL_TRANSPORT?.trim() || "(default)", RESEND_API_KEY: set("RESEND_API_KEY"), EMAIL_FROM: set("EMAIL_FROM") },
      storage: { driver: process.env.STORAGE_DRIVER?.trim() || "local", SUPABASE_URL: set("SUPABASE_URL"), SUPABASE_SERVICE_ROLE_KEY: set("SUPABASE_SERVICE_ROLE_KEY") },
      googleSheet: {
        sheetId: set("GOOGLE_SHEET_ID", "GOOGLE_SHEETS_SPREADSHEET_ID"),
        accountEmail: set("GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_SHEETS_CLIENT_EMAIL"),
        privateKey: set("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "GOOGLE_SHEETS_PRIVATE_KEY"),
      },
    },
    runtime: { node: process.version, environment: process.env.NODE_ENV ?? "unknown" },
  };

  return NextResponse.json(body, {
    status: database.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
