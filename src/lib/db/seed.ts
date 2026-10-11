import { and, count, eq, inArray } from "drizzle-orm";
import type { Database } from "./index";
import { LEGACY_SAMPLE_SLUGS, PORTFOLIO_BATCHES } from "./portfolio";
import { auditLogs, pricingConfig, pricingHistory, projectImages, projects, users } from "./schema";
import { DEFAULT_PRICING } from "@/lib/pricing/defaults";
import { hashPassword } from "@/lib/auth/password";
import { logger } from "@/lib/logger";

/**
 * Idempotent: creates only what is missing.
 *  - pricing version 1 from DEFAULT_PRICING
 *  - the first administrator from ADMIN_EMAIL / ADMIN_PASSWORD
 *  - the starter portfolio of real project photos (unless SEED_PORTFOLIO=false)
 */
export async function seedEssentials(db: Database): Promise<void> {
  const [{ value: pricingRows }] = await db.select({ value: count() }).from(pricingConfig);
  if (pricingRows === 0) {
    await db.transaction(async (tx) => {
      await tx.insert(pricingHistory).values({ version: 1, values: DEFAULT_PRICING, changeNote: "Initial pricing" }).onConflictDoNothing();
      await tx.insert(pricingConfig).values({ id: 1, version: 1, values: DEFAULT_PRICING }).onConflictDoNothing();
    });
    logger.info("seed.pricing_created", { version: 1 });
  }

  const [{ value: userRows }] = await db.select({ value: count() }).from(users);
  if (userRows === 0) {
    const email = process.env.ADMIN_EMAIL?.trim();
    const password = process.env.ADMIN_PASSWORD;
    if (email && password && password.length >= 12) {
      await db
        .insert(users)
        .values({ email, name: process.env.ADMIN_NAME?.trim() || "Administrator", passwordHash: await hashPassword(password), role: "admin" })
        .onConflictDoNothing();
      logger.info("seed.admin_created", { email });
    } else {
      logger.warn("seed.admin_skipped", {
        reason: "Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) to create the first administrator.",
      });
    }
  }

  if (process.env.SEED_PORTFOLIO !== "false") await seedPortfolio(db);
}

/**
 * Seeds each portfolio batch exactly once (recorded in the audit log). The
 * first batch also retires the illustrated placeholder projects of the first
 * release unless an administrator has already edited them.
 */
async function seedPortfolio(db: Database): Promise<void> {
  for (const batch of PORTFOLIO_BATCHES) {
    const [done] = await db.select({ id: auditLogs.id }).from(auditLogs).where(eq(auditLogs.action, batch.marker)).limit(1);
    if (done) continue;

    await db.transaction(async (tx) => {
      if (batch.marker === "seed.portfolio") {
        await tx.delete(projects).where(and(eq(projects.isSample, true), inArray(projects.slug, LEGACY_SAMPLE_SLUGS)));
      }
      for (const [index, p] of batch.projects.entries()) {
        const [row] = await tx
          .insert(projects)
          .values({
            slug: p.slug,
            name: p.name,
            location: p.location,
            categories: p.categories,
            description: p.description,
            paverType: p.paverType,
            featured: p.featured,
            published: true,
            sortOrder: batch.sortOffset + index,
          })
          .onConflictDoNothing()
          .returning({ id: projects.id });
        if (!row) continue;
        await tx.insert(projectImages).values(
          p.images.map((img, position) => ({ projectId: row.id, kind: img.kind, url: img.url, alt: img.alt, width: img.width, height: img.height, position })),
        );
      }
      await tx.insert(auditLogs).values({ action: batch.marker, entityType: "project", details: { count: batch.projects.length } });
    });
    logger.info("seed.portfolio_created", { batch: batch.marker, count: batch.projects.length });
  }
}
