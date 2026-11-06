import { JsonLd } from "@/components/json-ld";
import { SITE_URL, breadcrumbs, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Pricing in Ghana cedis",
  description: "Clear monthly pricing in Ghana cedis. Choose the plan that fits the websites you look after, and move up as you grow.",
  path: "/pricing",
});

interface Plan { name: string; tagline?: string; price_month: number }

/** The plans and prices live in the database, so the structured data is built from the same list the page shows. */
async function offers() {
  try {
    const res = await fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/plans`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const { plans } = (await res.json()) as { plans: Plan[] };
    return plans.map((p) => ({ "@type": "Offer", name: p.name, price: p.price_month, priceCurrency: "GHS", description: p.tagline, url: `${SITE_URL}/pricing` }));
  } catch { return []; }
}

export default async function PricingLayout({ children }: { children: React.ReactNode }) {
  const list = await offers();
  return (
    <>
      <JsonLd data={[
        breadcrumbs([["Home", "/"], ["Pricing", "/pricing"]]),
        ...(list.length ? [{ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "SiteRadar", applicationCategory: "BusinessApplication", operatingSystem: "Web", offers: list }] : []),
      ]} />
      {children}
    </>
  );
}
