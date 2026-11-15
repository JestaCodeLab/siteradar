import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { Container, CtaBand, Rings } from "@/components/mkt";
import { dateLabel, newestFirst } from "@/lib/insights";
import { eyebrow } from "@/lib/mkt-styles";
import { SITE_URL, breadcrumbs, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Insights",
  absoluteTitle: "Website Monitoring Guides & Insights | SiteRadar",
  description: "Practical guides on website uptime, SSL and domain expiry, WordPress monitoring, SEO and click-through rate, and how agencies keep client websites healthy.",
  path: "/insights",
});

export default function Insights() {
  const list = newestFirst();
  return (
    <>
      <JsonLd data={[
        breadcrumbs([["Home", "/"], ["Insights", "/insights"]]),
        { "@context": "https://schema.org", "@type": "CollectionPage", name: "SiteRadar Insights", url: `${SITE_URL}/insights`,
          hasPart: list.map((a) => ({ "@type": "Article", headline: a.title, url: `${SITE_URL}/insights/${a.slug}`, datePublished: a.published })) },
      ]} />
      <section className="relative overflow-hidden border-b border-[#EFE4D8] bg-[#FFF7ED]">
        <Rings className="-right-[260px] -top-[260px] hidden size-[900px] md:block" opacity={0.9} />
        <Container className="relative flex flex-col gap-3 pb-12 pt-10 md:gap-4 md:pb-20 md:pt-20">
          <span className={`${eyebrow} text-[#C2410C]`}>Insights</span>
          <h1 className="max-w-[820px] text-[28px] font-bold leading-[1.12] tracking-[-0.025em] md:text-[clamp(36px,4.6vw,56px)] md:leading-[1.05] md:tracking-[-0.035em]">Website monitoring guides, in plain language.</h1>
          <p className="max-w-[640px] text-base text-[#475569] md:text-[19px]">How to keep a website online, secure and found on Google, written for the people who look after it.</p>
        </Container>
      </section>
      <section className="py-12 md:py-20">
        <Container>
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {list.map((a) => (
              <li key={a.slug} className="relative flex flex-col gap-3 rounded-2xl border border-[#EFE4D8] bg-white p-6 hover:border-[#F97316]">
                <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#C2410C]">{a.category}</span>
                <h2 className="text-xl font-bold leading-snug tracking-[-0.01em]"><Link href={`/insights/${a.slug}`} className="after:absolute after:inset-0">{a.title}</Link></h2>
                <p className="text-[15px] leading-relaxed text-[#475569]">{a.description}</p>
                <div className="mt-auto flex items-center justify-between pt-2 text-sm text-[#64748B]">
                  <span>{dateLabel(a.published)} · {a.minutes} min read</span>
                  <ArrowRight size={16} aria-hidden="true" className="text-[#C2410C]" />
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <CtaBand title="Put your website on the radar." text="Uptime, SSL, domain and SEO checks, with alerts on WhatsApp. Add your first website in about ten minutes." primary={{ href: "/signup", label: "Get started" }} secondary={{ href: "/pricing", label: "See pricing" }} />
    </>
  );
}
