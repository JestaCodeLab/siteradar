import { JsonLd } from "@/components/json-ld";
import { FAQ } from "@/lib/pricing-faq";
import { SITE_URL, breadcrumbs, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Pricing",
  absoluteTitle: "Website Monitoring Pricing: Plans from $12.99/month | SiteRadar",
  description: "Website monitoring plans from $12.99 a month: uptime, SSL, domain and DNS checks, daily SEO audits, WhatsApp alerts and monthly client reports. Pay in US dollars, cancel any time.",
  path: "/pricing",
  image: "/og/og-pricing.png",
});

interface Plan { name: string; tagline?: string; price_month: number; currency?: string }

/** The plans and prices live in the database, so the structured data is built from the same list the page shows. */
async function offers() {
  try {
    const res = await fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/plans`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const { plans } = (await res.json()) as { plans: Plan[] };
    return plans.map((p) => ({ "@type": "Offer", name: p.name, price: p.price_month, priceCurrency: "USD", description: p.tagline, url: `${SITE_URL}/pricing`, availability: "https://schema.org/InStock" }));
  } catch { return []; }
}

export default async function PricingLayout({ children }: { children: React.ReactNode }) {
  const list = await offers();
  return (
    <>
      <JsonLd data={[
        breadcrumbs([["Home", "/"], ["Pricing", "/pricing"]]),
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
        ...(list.length ? [{ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "SiteRadar", applicationCategory: "BusinessApplication", operatingSystem: "Web", offers: list }] : []),
      ]} />
      {children}
    </>
  );
}
