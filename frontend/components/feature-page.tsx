import Link from "next/link";
import { createElement } from "react";
import { ArrowRight, Building2, Users } from "lucide-react";
import { CtaBand, Container, Rings } from "@/components/mkt";
import { HERO_CARDS } from "@/components/feature-heroes";
import { FEATURE_PAGES, type FeaturePageData, type IconPart } from "@/lib/feature-pages";
import { btnOrange, btnOutlineInk, card, eyebrow, h2, iconTile } from "@/lib/mkt-styles";

/** A small stroke icon from the design, drawn from its list of shapes. */
function Icon({ parts, size }: { parts: IconPart[]; size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {parts.map((p, i) => createElement(p.tag, { key: i, ...p.attrs }))}
    </svg>
  );
}

/** One page under /features: headline and example card, what you get, who it is for, related features, and a sign-up band. */
export function FeaturePage({ slug, page }: { slug: string; page: FeaturePageData }) {
  const Hero = HERO_CARDS[slug];
  const related = page.related.map((s) => ({ slug: s, page: FEATURE_PAGES[s] })).filter((r) => r.page);
  const whoIcons = [Users, Building2];
  return (
    <>
      <section className="relative overflow-hidden border-b border-[#F5E6D3] bg-[#FFF7ED]">
        <Rings className="-left-[300px] -bottom-[300px] hidden size-[760px] md:block" opacity={0.9} />
        <Container className="relative flex flex-col gap-6 pb-14 pt-10 md:gap-7 md:pb-[88px] md:pt-[72px]">
          <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-[#475569]">
            <Link href="/" className="hover:text-[#C2410C]">Home</Link><span aria-hidden="true">/</span><span>Features</span><span aria-hidden="true">/</span><span>{page.group}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-10 md:gap-14">
            <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-5">
              <span className={`${eyebrow} inline-flex items-center gap-2 self-start rounded-full bg-[#FFEDD5] px-3 py-1.5 text-[#9A3412]`}><Icon parts={page.icon} size={16} />{page.name}</span>
              <h1 className="text-[clamp(32px,4.6vw,56px)] font-bold leading-[1.05] tracking-[-0.035em]">{page.h1}</h1>
              <p className="text-base leading-relaxed text-[#475569] md:text-[19px]">{page.lead}</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/signup" className={btnOrange}>Get started</Link>
                <Link href="/pricing" className={btnOutlineInk}>See plans</Link>
              </div>
            </div>
            <div className="min-w-0 flex-[1_1_440px]">{Hero ? <Hero /> : null}</div>
          </div>
        </Container>
      </section>

      <section className="border-y border-[#EFE4D8] bg-white">
        <Container className="flex flex-col gap-8 py-14 md:gap-10 md:py-24">
          <div className="flex max-w-[720px] flex-col gap-3">
            <span className={`${eyebrow} text-[#C2410C]`}>What you get</span>
            <h2 className={h2}>{page.whatTitle}</h2>
          </div>
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
            {page.cards.map((c) => (
              <div key={c.title} className={card}>
                <span className={iconTile}><Icon parts={c.icon} size={22} /></span>
                <h3 className="text-lg font-bold">{c.title}</h3>
                <p className="text-[15px] text-[#475569]">{c.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-8 py-14 md:gap-10 md:py-24">
        <div className="flex max-w-[720px] flex-col gap-3">
          <span className={`${eyebrow} text-[#C2410C]`}>Who it is for</span>
          <h2 className={h2}>{page.whoTitle}</h2>
        </div>
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
          {page.who.map((w, i) => {
            const WhoIcon = whoIcons[i] ?? Users;
            return (
              <Link key={w.href} href={w.href} className={`flex flex-col gap-3 rounded-2xl border border-[#EFE4D8] border-t-4 bg-white p-7 ${i === 0 ? "border-t-[#F97316]" : "border-t-[#FBA23C]"}`}>
                <span className="flex items-center gap-2.5 text-[21px] font-bold"><WhoIcon size={22} aria-hidden="true" className="text-[#C2410C]" />{w.label}</span>
                <span className="text-base text-[#475569]">{w.text}</span>
                <span className="font-bold text-[#C2410C]">{w.link}</span>
              </Link>
            );
          })}
        </div>
      </Container>

      {related.length > 0 && (
        <section className="bg-[#0F172A] text-white">
          <Container className="flex flex-col gap-8 py-14 md:py-[88px]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-3">
                <span className={`${eyebrow} text-[#FDBA74]`}>Works well with</span>
                <h2 className="text-[26px] font-bold leading-[1.1] tracking-[-0.03em] md:text-[clamp(28px,3.2vw,40px)]">One radar for the whole website.</h2>
              </div>
              <Link href="/pricing" className="inline-flex items-center gap-1.5 font-bold text-[#FDBA74]">See what each plan includes <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
              {related.map((r) => (
                <Link key={r.slug} href={`/features/${r.slug}`} className="flex flex-col gap-2.5 rounded-2xl border border-[#334155] bg-[#1E293B] p-6 text-white">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-[#334155] text-[#FDBA74]"><Icon parts={r.page.icon} size={22} /></span>
                  <span className="text-lg font-bold">{r.page.name}</span>
                  <span className="text-[15px] text-[#CBD5E1]">{r.page.h1}</span>
                  <span className="mt-auto font-bold text-[#FDBA74]">Learn more →</span>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      <CtaBand onPage title={page.ctaTitle} text={page.ctaText} primary={{ href: "/signup", label: "Get started" }} secondary={{ href: "/contact", label: "Talk to us" }} />
    </>
  );
}
