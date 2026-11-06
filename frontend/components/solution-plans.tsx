"use client";

import Link from "next/link";
import { money } from "@/lib/me";
import { usePlans } from "@/lib/plans";

type Tile = { id: string; per: string; line: (p: { sites: number; members: number }) => string; highlight?: boolean };

const SETS: Record<"agencies" | "businesses", { tiles: Tile[]; min: number; flex: string }> = {
  agencies: { min: 240, flex: "1.4 1 520px", tiles: [
    { id: "growth", per: " / month", highlight: true, line: (p) => `${p.sites} websites · ${p.members} team members · SMS alerts` },
    { id: "scale", per: " / month", line: (p) => `${p.sites} websites · ${p.members} team members · checks every minute` } ] },
  businesses: { min: 200, flex: "1.6 1 560px", tiles: [
    { id: "free", per: " / mo", line: (p) => `${p.sites} website · email alerts` },
    { id: "starter", per: " / mo", highlight: true, line: (p) => `${p.sites} websites · ${p.members} team members` },
    { id: "scale", per: " / mo", line: (p) => `${p.sites} websites · checks every minute` } ] },
};

/** The dark "Plans for ..." band on the solutions pages. Prices and limits come from the live plans. */
export function SolutionPlans({ variant, eyebrowText, title }: { variant: "agencies" | "businesses"; eyebrowText: string; title: string }) {
  const plans = usePlans()?.plans ?? [];
  const set = SETS[variant];
  return (
    <section className="bg-[#0F172A] text-white">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-3.5 px-5 py-12 md:gap-12 md:px-6 md:py-[88px]">
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5 max-md:contents">
          <span className="w-full text-[13px] font-bold uppercase tracking-[0.08em] text-[#FDBA74] md:w-auto">{eyebrowText}</span>
          <h2 className="hidden text-[clamp(28px,3.2vw,40px)] font-bold leading-[1.1] tracking-[-0.03em] md:block">{title}</h2>
          <Link href="/pricing" className="order-last font-bold text-[#FDBA74] hover:text-white md:order-none">Compare all plans →</Link>
        </div>
        <div className="grid w-full min-w-0 gap-3.5 md:w-auto md:gap-4 md:[flex:var(--flex)] md:[grid-template-columns:repeat(auto-fit,minmax(var(--min),1fr))]" style={{ "--flex": set.flex, "--min": `${set.min}px` } as React.CSSProperties}>
          {set.tiles.map((t) => {
            const p = plans.find((x) => x.id === t.id);
            if (!p) return null;
            return t.highlight ? (
              <div key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 rounded-2xl border-2 border-[#F97316] bg-[#FFF7ED] p-[18px] text-[#0F172A] md:flex md:flex-col md:items-stretch md:gap-2 md:rounded-[18px] md:p-6">
                <span className="font-bold text-[#9A3412]">{p.name}</span>
                <span className="row-span-2 col-start-2 row-start-1 md:contents"><span className="font-mono text-lg font-semibold md:text-[34px]">{money(p.price_month, p.currency)}</span><span className="hidden text-[#475569] md:inline">{t.per}</span></span>
                <span className="text-[13px] text-[#475569] md:text-base md:text-[#334155]">{t.line(p)}</span>
              </div>
            ) : (
              <div key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 rounded-2xl border border-[#334155] bg-[#1E293B] p-[18px] md:flex md:flex-col md:items-stretch md:gap-2 md:rounded-[18px] md:p-6">
                <span className="font-bold text-[#E2E8F0]">{p.name}</span>
                <span className="row-span-2 col-start-2 row-start-1 md:contents"><span className="font-mono text-lg font-semibold md:text-[34px]">{money(p.price_month, p.currency)}</span><span className="hidden text-[#CBD5E1] md:inline">{t.per}</span></span>
                <span className="text-[13px] text-[#CBD5E1] md:text-base">{t.line(p)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
