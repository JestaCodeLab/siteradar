import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { InsightText } from "@/components/insight-text";
import { Container, CtaBand } from "@/components/mkt";
import { ARTICLES, bySlug, dateLabel } from "@/lib/insights";
import { eyebrow } from "@/lib/mkt-styles";
import { SITE_NAME, SITE_URL, breadcrumbs, pageMeta } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };
export const generateStaticParams = () => ARTICLES.map((a) => ({ slug: a.slug }));
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = bySlug((await params).slug);
  if (!a) return {};
  return pageMeta({ title: a.seoTitle, description: a.description, path: `/insights/${a.slug}` });
}

export default async function Article({ params }: Props) {
  const a = bySlug((await params).slug);
  if (!a) notFound();
  const path = `/insights/${a.slug}`;
  const more = ARTICLES.filter((x) => x.slug !== a.slug).slice(0, 3);
  return (
    <>
      <JsonLd data={[
        breadcrumbs([["Home", "/"], ["Insights", "/insights"], [a.title, path]]),
        { "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.description, url: SITE_URL + path,
          datePublished: a.published, dateModified: a.updated ?? a.published, mainEntityOfPage: SITE_URL + path,
          author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL }, publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL } },
        ...(a.faq ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: a.faq.map(([q, ans]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: ans } })) }] : []),
      ]} />
      <article>
        <header className="border-b border-[#EFE4D8] bg-[#FFF7ED]">
          <Container className="flex max-w-[820px] flex-col gap-4 pb-10 pt-8 md:pb-14 md:pt-14">
            <nav aria-label="Breadcrumb" className="text-sm text-[#64748B]"><Link href="/insights" className="hover:text-[#C2410C]">Insights</Link> <span aria-hidden="true">/</span> {a.category}</nav>
            <span className={`${eyebrow} text-[#C2410C]`}>{a.category}</span>
            <h1 className="text-[28px] font-bold leading-[1.12] tracking-[-0.025em] md:text-[clamp(34px,4vw,50px)] md:leading-[1.08] md:tracking-[-0.03em]">{a.title}</h1>
            <p className="text-sm text-[#64748B]">By the {SITE_NAME} team · {dateLabel(a.published)} · {a.minutes} min read</p>
          </Container>
        </header>
        <Container className="max-w-[820px] py-10 md:py-14">
          <div className="flex flex-col gap-5 text-[17px] leading-[1.75] text-[#334155]">
            {a.intro.map((t, i) => <p key={i} className={i === 0 ? "text-[19px] text-[#0F172A]" : ""}><InsightText text={t} /></p>)}
            {a.sections.map((s) => (
              <section key={s.h} className="flex flex-col gap-4">
                <h2 className="mt-4 text-2xl font-bold leading-snug tracking-[-0.02em] text-[#0F172A] md:text-[28px]">{s.h}</h2>
                {s.p.map((t, i) => <p key={i}><InsightText text={t} /></p>)}
                {s.list && <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-[#F97316]">{s.list.map((t, i) => <li key={i} className={t.startsWith("`") ? "list-none -ml-6" : ""}><InsightText text={t} /></li>)}</ul>}
                {s.after?.map((t, i) => <p key={i}><InsightText text={t} /></p>)}
              </section>
            ))}
            {a.faq && (
              <section className="flex flex-col gap-4">
                <h2 className="mt-4 text-2xl font-bold tracking-[-0.02em] text-[#0F172A] md:text-[28px]">Frequently asked questions</h2>
                {a.faq.map(([q, ans]) => <div key={q}><h3 className="text-lg font-bold text-[#0F172A]">{q}</h3><p className="mt-1">{ans}</p></div>)}
              </section>
            )}
          </div>
          <aside className="mt-12 flex flex-col gap-3 rounded-2xl border border-[#FDBA74] bg-[#FFF7ED] p-6">
            <h2 className="text-xl font-bold">{a.cta.title}</h2>
            <p className="text-[#475569]">{a.cta.text}</p>
            <Link href={a.cta.href} className="inline-flex w-fit items-center rounded-xl bg-[#F97316] px-5 py-3 font-bold text-white hover:bg-[#EA580C]">{a.cta.label}</Link>
          </aside>
        </Container>
      </article>
      <section className="border-t border-[#EFE4D8] py-12">
        <Container>
          <h2 className="mb-5 text-2xl font-bold tracking-[-0.02em]">More guides</h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {more.map((m) => <li key={m.slug} className="relative rounded-2xl border border-[#EFE4D8] bg-white p-5 hover:border-[#F97316]"><Link href={`/insights/${m.slug}`} className="font-bold after:absolute after:inset-0">{m.title}</Link><p className="mt-1 text-sm text-[#64748B]">{m.minutes} min read</p></li>)}
          </ul>
        </Container>
      </section>
      <CtaBand title="Put your website on the radar." text="Uptime, SSL, domain and SEO checks, with alerts on WhatsApp. Add your first website in about ten minutes." primary={{ href: "/signup", label: "Get started" }} secondary={{ href: "/pricing", label: "See pricing" }} />
    </>
  );
}
