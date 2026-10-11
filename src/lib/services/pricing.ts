import { desc, eq } from "drizzle-orm";
import { getDb, type Executor } from "@/lib/db";
import { pricingConfig, pricingHistory, users } from "@/lib/db/schema";
import { DEFAULT_PRICING } from "@/lib/pricing/defaults";
import { assertValidPricing } from "@/lib/pricing/engine";
import type { PricingConfig } from "@/lib/pricing/types";
import { audit } from "./audit";

export interface CurrentPricing {
  version: number;
  values: PricingConfig;
  updatedAt: Date;
}

/** Fill keys added to PricingConfig after a version was stored. */
function complete(values: Partial<PricingConfig>): PricingConfig {
  return { ...DEFAULT_PRICING, ...values };
}

export async function getCurrentPricing(executor?: Executor): Promise<CurrentPricing> {
  const db = executor ?? (await getDb());
  const [row] = await db.select().from(pricingConfig).where(eq(pricingConfig.id, 1)).limit(1);
  if (!row) throw new Error("Pricing has not been configured. Run `npm run db:setup`.");
  return { version: row.version, values: complete(row.values), updatedAt: row.updatedAt };
}

export async function getPricingVersion(version: number): Promise<PricingConfig | null> {
  const db = await getDb();
  const [row] = await db.select().from(pricingHistory).where(eq(pricingHistory.version, version)).limit(1);
  return row ? complete(row.values) : null;
}

export async function listPricingHistory(limit = 50) {
  const db = await getDb();
  return db
    .select({
      version: pricingHistory.version,
      values: pricingHistory.values,
      changeNote: pricingHistory.changeNote,
      createdAt: pricingHistory.createdAt,
      changedByName: users.name,
    })
    .from(pricingHistory)
    .leftJoin(users, eq(users.id, pricingHistory.changedBy))
    .orderBy(desc(pricingHistory.version))
    .limit(limit);
}

/**
 * Creates a new pricing version. Existing quotations keep pointing at the
 * version (and snapshot) they were generated with, so they never change.
 */
export async function updatePricing(
  values: PricingConfig,
  opts: { actorUserId: string; changeNote?: string; ipAddress?: string | null },
): Promise<number> {
  assertValidPricing(values);
  const db = await getDb();
  return db.transaction(async (tx) => {
    // Lock the current row so two admins saving at once get distinct versions.
    const [current] = await tx.select().from(pricingConfig).where(eq(pricingConfig.id, 1)).for("update");
    if (!current) throw new Error("Pricing has not been configured.");

    const nextVersion = current.version + 1;
    await tx.insert(pricingHistory).values({
      version: nextVersion,
      values,
      changeNote: opts.changeNote ?? null,
      changedBy: opts.actorUserId,
    });
    await tx
      .update(pricingConfig)
      .set({ version: nextVersion, values, updatedBy: opts.actorUserId, updatedAt: new Date() })
      .where(eq(pricingConfig.id, 1));

    const before = complete(current.values);
    const changes = Object.fromEntries(
      (Object.keys(values) as (keyof PricingConfig)[])
        .filter((k) => before[k] !== values[k])
        .map((k) => [k, { from: before[k], to: values[k] }]),
    );
    await audit(tx, {
      actorUserId: opts.actorUserId,
      action: "pricing.updated",
      entityType: "pricing",
      entityId: String(nextVersion),
      details: { changes, note: opts.changeNote },
      ipAddress: opts.ipAddress,
    });
    return nextVersion;
  });
}
