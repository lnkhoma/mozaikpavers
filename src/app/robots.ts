import type { MetadataRoute } from "next";
import { company } from "@/config/company";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }],
    sitemap: `${company.siteUrl}/sitemap.xml`,
  };
}
