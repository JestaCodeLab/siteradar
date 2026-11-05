"use client";

import { ghs } from "@/lib/me";
import { usePlans } from "@/lib/plans";

const LINE: Record<string, (p: { sites: number; members: number; interval_minutes: number }) => string> = {
  free: (p) => `${p.sites} website · email alerts · watermarked report`,
  starter: (p) => `${p.sites} websites · ${p.members} team members`,
  growth: (p) => `${p.sites} websites · ${p.members} team members · SMS alerts`,
  scale: (p) => `${p.sites} websites · ${p.members} team members · checks every minute`,
};

/** The four plan tiles on the home page, with live prices. */
export function HomePlans({ ids, short = false }: { ids?: string[]; short?: boolean }) {
  const all = usePlans()?.plans ?? [];
  const plans = ids ? ids.map((i) => all.find((p) => p.id === i)).filter((p): p is (typeof all)[number] => !!p) : all;
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
      {plans.map((p) => {
        const pop = p.id === "growth";
        return (
          <div key={p.id} className={`flex flex-col gap-2 rounded-2xl p-6 ${pop ? "border-2 border-[#F97316] bg-[#FFF7ED] !p-[23px]" : "border border-[#EFE4D8]"}`}>
            <span className={`text-sm font-bold ${pop ? "text-[#9A3412]" : "text-[#475569]"}`}>{p.name}</span>
            <span className="text-[34px] font-extrabold tracking-[-0.03em]">{ghs(p.price_month)} <span className="text-[15px] font-normal text-[#475569]">/ month</span></span>
            <span className="text-sm text-[#475569]">{short && p.id === "starter" ? `${p.sites} websites · ${p.members} team members` : (LINE[p.id] ?? LINE.starter)(p)}</span>
          </div>
        );
      })}
    </div>
  );
}
