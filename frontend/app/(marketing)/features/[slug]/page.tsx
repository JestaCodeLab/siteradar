import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeaturePage } from "@/components/feature-page";
import { JsonLd } from "@/components/json-ld";
import { FEATURE_PAGES } from "@/lib/feature-pages";
import { SITE_NAME, SITE_URL, breadcrumbs, pageMeta } from "@/lib/seo";

/** Only the listed features exist. Anything else under /features is a 404. */
export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(FEATURE_PAGES).map((slug) => ({ slug }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = FEATURE_PAGES[slug];
  if (!page) return {};
  return pageMeta({ title: page.seoTitle, description: page.seoDescription, path: `/features/${slug}`, image: `/og/features/${slug}` });
}

export default async function FeatureRoute({ params }: Props) {
  const { slug } = await params;
  const page = FEATURE_PAGES[slug];
  if (!page) notFound();
  const path = `/features/${slug}`;
  return (
    <>
      <JsonLd data={[
        breadcrumbs([["Home", "/"], [page.name, path]]),
        {
          "@context": "https://schema.org", "@type": "WebPage", name: page.seoTitle, description: page.seoDescription, url: SITE_URL + path,
          isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
          about: { "@type": "SoftwareApplication", name: SITE_NAME, applicationCategory: "BusinessApplication", operatingSystem: "Web", featureList: page.cards.map((c) => c.title) },
        },
      ]} />
      <FeaturePage slug={slug} page={page} />
    </>
  );
}
