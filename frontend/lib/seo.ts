import type { Metadata } from "next";

/** The public address of the website, with no trailing slash. Set NEXT_PUBLIC_SITE_URL in production. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "SiteRadar";
export const DEFAULT_DESCRIPTION =
  "Website monitoring for agencies and businesses: uptime, SSL, domain and DNS checks, visitor stats and monthly reports, with alerts by email, Slack and Teams.";

/** The 1200 x 630 share pictures in public/og. Pages without their own use the home one. */
export const DEFAULT_OG = "/og/og-home.png";
const og = (image: string, alt: string) => ({ url: image, width: 1200, height: 630, alt });

/** Title, description, canonical address and social cards for one public page. `title` is the page name; the site name is added by the root template. */
export function pageMeta({ title, description, path, absoluteTitle, noindex, image = DEFAULT_OG, ogTitle, ogDescription }: {
  title: string; description: string; path: string; absoluteTitle?: string; noindex?: boolean; image?: string;
  /** Wording for link previews (Facebook, LinkedIn, WhatsApp, X) when it should differ from the search result. */
  ogTitle?: string; ogDescription?: string;
}): Metadata {
  const full = absoluteTitle ?? `${title} · ${SITE_NAME}`;
  const shareTitle = ogTitle ?? full, shareText = ogDescription ?? description;
  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_GH", url: path, title: shareTitle, description: shareText, images: [og(image, shareTitle)] },
    twitter: { card: "summary_large_image", title: shareTitle, description: shareText, images: [image] },
  };
}

/** Structured data for search engines. Rendered in a script tag by <JsonLd>. */
export const organization = {
  "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: SITE_URL,
  logo: `${SITE_URL}/app-icon/siteradar-app-icon-512.png`,
};

export const breadcrumbs = (items: [string, string][]) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE_URL + path })),
});
