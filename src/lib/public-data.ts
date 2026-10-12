import { unstable_cache } from "next/cache";
import type { ProjectCategory } from "@/lib/constants";
import { staticProjects } from "@/lib/db/portfolio-fallback";
import { logger } from "@/lib/logger";
import { DEFAULT_PRICING } from "@/lib/pricing/defaults";
import type { PricingConfig } from "@/lib/pricing/types";
import { getCurrentPricing } from "@/lib/services/pricing";
import {
  getPublishedProjectBySlug,
  listFeaturedProjects,
  listPublishedProjects,
  listTransformations,
  type ProjectWithImages,
} from "@/lib/services/projects";

/**
 * Cached reads for public pages. Admin actions invalidate these tags, so
 * visitors see changes immediately while normal traffic skips the database.
 * (Cached values are JSON-serialised: only rely on string dates here.)
 *
 * If the database cannot be reached, each read falls back to content that
 * ships with the code (the starter portfolio, the default rates) so public
 * pages still display. Fallbacks are never cached: the next request tries
 * the database again.
 */
export const CACHE_TAGS = { projects: "projects", pricing: "pricing" } as const;

const HOUR = 3600;

/** After a failure, skip the database for this long so pages stay fast. */
const RETRY_AFTER_MS = 30_000;
let databaseDownUntil = 0;
let lastFallbackLog = 0;

class DatabasePaused extends Error {}

/** Runs a database read unless the database failed moments ago. */
function read<T>(query: () => Promise<T>): Promise<T> {
  if (Date.now() < databaseDownUntil) return Promise.reject(new DatabasePaused());
  return query();
}

function fallback<T>(what: string, error: unknown, value: T): T {
  if (!(error instanceof DatabasePaused)) {
    databaseDownUntil = Date.now() + RETRY_AFTER_MS;
    // At most one log line a minute; a down database would otherwise flood the logs.
    if (Date.now() - lastFallbackLog > 60_000) {
      lastFallbackLog = Date.now();
      logger.error("public_data.database_unavailable", { what, error });
    }
  }
  return value;
}

const cachedPricing = unstable_cache(
  async () => {
    const p = await getCurrentPricing();
    return { version: p.version, values: p.values };
  },
  ["public-pricing"],
  { tags: [CACHE_TAGS.pricing], revalidate: HOUR },
);

export interface PublicPricing {
  version: number;
  values: PricingConfig;
  /** False when the database was unreachable and default rates are shown. */
  live: boolean;
}

export async function getPublicPricing(): Promise<PublicPricing> {
  try {
    return { ...(await read(() => cachedPricing())), live: true };
  } catch (error) {
    return fallback("pricing", error, { version: 0, values: DEFAULT_PRICING, live: false });
  }
}

const cachedFeatured = unstable_cache(async (limit: number) => listFeaturedProjects(limit), ["featured-projects"], {
  tags: [CACHE_TAGS.projects],
  revalidate: HOUR,
});

export async function getFeaturedProjects(limit: number): Promise<ProjectWithImages[]> {
  try {
    return await read(() => cachedFeatured(limit));
  } catch (error) {
    return fallback("featured projects", error, staticProjects.featured(limit));
  }
}

const cachedPublished = unstable_cache(async (category?: ProjectCategory) => listPublishedProjects(category), ["published-projects"], {
  tags: [CACHE_TAGS.projects],
  revalidate: HOUR,
});

export async function getPublishedProjects(category?: ProjectCategory): Promise<ProjectWithImages[]> {
  try {
    return await read(() => cachedPublished(category));
  } catch (error) {
    return fallback("projects", error, staticProjects.published(category));
  }
}

const cachedTransformations = unstable_cache(async (limit?: number) => listTransformations(limit), ["transformations"], {
  tags: [CACHE_TAGS.projects],
  revalidate: HOUR,
});

export async function getTransformations(limit?: number): Promise<ProjectWithImages[]> {
  try {
    return await read(() => cachedTransformations(limit));
  } catch (error) {
    return fallback("transformations", error, staticProjects.transformations(limit));
  }
}

const cachedBySlug = unstable_cache(async (slug: string) => getPublishedProjectBySlug(slug), ["project-by-slug"], {
  tags: [CACHE_TAGS.projects],
  revalidate: HOUR,
});

export async function getProjectBySlug(slug: string): Promise<ProjectWithImages | null> {
  try {
    return await read(() => cachedBySlug(slug));
  } catch (error) {
    return fallback("project", error, staticProjects.bySlug(slug));
  }
}
