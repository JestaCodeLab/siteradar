"use client";

import Link from "next/link";
import { ghs } from "@/lib/me";
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
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-12 px-6 py-[88px]">
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5">
          <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#FDBA74]">{eyebrowText}</span>
          <h2 className="text-[clamp(28px,3.2vw,40px)] font-bold leading-[1.1] tracking-[-0.03em]">{title}</h2>
          <Link href="/pricing" className="font-bold text-[#FDBA74] hover:text-white">Compare all plans →</Link>
        </div>
        <div className="grid min-w-0 gap-4" style={{ flex: set.flex, gridTemplateColumns: `repeat(auto-fit, minmax(${set.min}px, 1fr))` }}>
          {set.tiles.map((t) => {
            const p = plans.find((x) => x.id === t.id);
            if (!p) return null;
            return t.highlight ? (
              <div key={t.id} className="flex flex-col gap-2 rounded-[18px] border-2 border-[#F97316] bg-[#FFF7ED] p-6 text-[#0F172A]">
                <span className="font-bold text-[#9A3412]">{p.name}</span>
                <span><span className="font-mono text-[34px] font-semibold">{ghs(p.price_month)}</span><span className="text-[#475569]">{t.per}</span></span>
                <span className="text-[#334155]">{t.line(p)}</span>
              </div>
            ) : (
              <div key={t.id} className="flex flex-col gap-2 rounded-[18px] border border-[#334155] bg-[#1E293B] p-6">
                <span className="font-bold text-[#E2E8F0]">{p.name}</span>
                <span><span className="font-mono text-[34px] font-semibold">{ghs(p.price_month)}</span><span className="text-[#CBD5E1]">{t.per}</span></span>
                <span className="text-[#CBD5E1]">{t.line(p)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
