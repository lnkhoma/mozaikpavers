import { unstable_cache } from "next/cache";
import type { ProjectCategory } from "@/lib/constants";
import { getCurrentPricing } from "@/lib/services/pricing";
import {
  getPublishedProjectBySlug,
  listFeaturedProjects,
  listPublishedProjects,
  listTransformations,
} from "@/lib/services/projects";

/**
 * Cached reads for public pages. Admin actions invalidate these tags, so
 * visitors see changes immediately while normal traffic skips the database.
 * (Cached values are JSON-serialised: only rely on string dates here.)
 */
export const CACHE_TAGS = { projects: "projects", pricing: "pricing" } as const;

const HOUR = 3600;

export const getPublicPricing = unstable_cache(
  async () => {
    const p = await getCurrentPricing();
    return { version: p.version, values: p.values };
  },
  ["public-pricing"],
  { tags: [CACHE_TAGS.pricing], revalidate: HOUR },
);

export const getFeaturedProjects = unstable_cache(
  async (limit: number) => listFeaturedProjects(limit),
  ["featured-projects"],
  { tags: [CACHE_TAGS.projects], revalidate: HOUR },
);

export const getPublishedProjects = unstable_cache(
  async (category?: ProjectCategory) => listPublishedProjects(category),
  ["published-projects"],
  { tags: [CACHE_TAGS.projects], revalidate: HOUR },
);

export const getTransformations = unstable_cache(
  async (limit?: number) => listTransformations(limit),
  ["transformations"],
  { tags: [CACHE_TAGS.projects], revalidate: HOUR },
);

export const getProjectBySlug = unstable_cache(
  async (slug: string) => getPublishedProjectBySlug(slug),
  ["project-by-slug"],
  { tags: [CACHE_TAGS.projects], revalidate: HOUR },
);
