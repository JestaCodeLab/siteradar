import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/overview", "/websites", "/subscriptions", "/settings", "/activity", "/billing", "/team", "/onboarding", "/verify", "/forgot", "/invite", "/auth/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
