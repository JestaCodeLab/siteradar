import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const pages: [string, number][] = [["/", 1], ["/pricing", 0.9], ["/agencies", 0.8], ["/businesses", 0.8], ["/contact", 0.6], ["/terms-of-service", 0.3], ["/privacy", 0.3], ["/signup", 0.7], ["/login", 0.4]];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map(([path, priority]) => ({ url: SITE_URL + path, changeFrequency: "monthly", priority }));
}
