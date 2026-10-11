import type { MetadataRoute } from "next";
import { company } from "@/config/company";
import { getPublishedProjects } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = company.siteUrl;
  const pages = ["", "/projects", "/products", "/before-after", "/services", "/about", "/quote", "/contact", "/site-assessment"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : p === "/quote" ? 0.9 : 0.7,
  }));
  const projects = await getPublishedProjects().catch(() => []);
  return [
    ...pages,
    ...projects.map((p) => ({ url: `${base}/projects/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
