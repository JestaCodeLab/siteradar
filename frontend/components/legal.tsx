import type { ReactNode } from "react";
import { Container, Rings } from "./mkt";
import { eyebrow } from "@/lib/mkt-styles";
import { LEGAL } from "@/lib/legal";

export interface LegalSection { id: string; title: string; body: ReactNode }

/** Shared layout for the terms and the privacy policy: a heading, a contents list, then numbered sections. */
export function LegalPage({ label, title, intro, sections }: { label: string; title: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-[#EFE4D8] bg-[#FFF7ED]">
        <Rings className="-right-[260px] -top-[260px] size-[900px]" opacity={0.9} />
        <Container className="relative flex flex-col gap-4 pb-14 pt-[72px]">
          <span className={`${eyebrow} text-[#C2410C]`}>{label}</span>
          <h1 className="max-w-[860px] text-[28px] font-bold leading-[1.12] tracking-[-0.025em] md:text-[clamp(34px,4.2vw,52px)] md:font-bold md:leading-[1.06] md:tracking-[-0.035em] text-[#0F172A]">{title}</h1>
          <p className="text-[15px] text-[#475569]">Last updated {LEGAL.updated}</p>
        </Container>
      </section>

      <section className="bg-[#FBF8F4] py-14">
        <Container className="flex flex-wrap items-start gap-12">
          <nav aria-label="On this page" className="w-full flex-none lg:sticky lg:top-24 lg:w-[260px]">
            <p className="mb-3 text-sm font-bold text-[#0F172A]">On this page</p>
            <ol className="flex flex-col gap-1.5 text-[15px]">
              {sections.map((s, i) => (
                <li key={s.id}><a href={`#${s.id}`} className="flex min-h-9 items-center gap-2 text-[#475569] hover:text-[#C2410C]"><span className="w-5 text-right text-[#94A3B8]">{i + 1}.</span>{s.title}</a></li>
              ))}
            </ol>
          </nav>

          <article className="min-w-0 flex-[1_1_520px] max-w-[760px] text-[17px] leading-[1.7] text-[#334155] [&_a]:font-semibold [&_a]:text-[#C2410C] [&_a:hover]:text-[#7C2D12] [&_li]:pl-1 [&_p+p]:mt-4 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
            <div className="mb-10 rounded-2xl border border-[#EFE4D8] bg-white p-6 text-base">{intro}</div>
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24 border-t border-[#EFE4D8] py-8 first:border-t-0">
                <h2 className="mb-3 text-[24px] font-bold tracking-[-0.02em] text-[#0F172A]">{i + 1}. {s.title}</h2>
                {s.body}
              </section>
            ))}
          </article>
        </Container>
      </section>
    </>
  );
}
