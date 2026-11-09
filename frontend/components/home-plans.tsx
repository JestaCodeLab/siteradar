"use client";

import { money } from "@/lib/me";
import { usePlans } from "@/lib/plans";

const LINE: Record<string, (p: { sites: number; members: number; interval_minutes: number; sms: number }) => string> = {
  freelance: (p) => `${p.sites} website${p.sites === 1 ? "" : "s"} · email alerts`,
  starter: (p) => `${p.sites} websites · ${p.members} team members`,
  growth: (p) => `${p.sites} websites · ${p.members} team members`,
  scale: (p) => `${p.sites} websites · ${p.members} team members · checks every minute`,
};

/** The four plan tiles on the home page, with live prices. */
export function HomePlans({ ids, short = false }: { ids?: string[]; short?: boolean }) {
  const all = usePlans()?.plans ?? [];
  const plans = ids ? ids.map((i) => all.find((p) => p.id === i)).filter((p): p is (typeof all)[number] => !!p) : all;
  return (
    <>
    <div className="flex flex-col gap-3.5 md:hidden">
      {plans.map((p) => {
        const pop = p.id === "growth";
        const line = p.id === "freelance" ? `${p.sites} website${p.sites === 1 ? "" : "s"} · email alerts` : p.id === "starter" ? `${p.sites} websites · ${p.members} team members` : p.id === "growth" ? `${p.sites} websites · ${p.members} team members` : `${p.sites} websites · every minute`;
        return (
          <div key={p.id} className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 ${pop ? "border-2 border-[#F97316] bg-[#FFF7ED] !px-[15px] !py-[13px]" : "border border-[#EFE4D8]"}`}>
            <div><div className={`font-bold ${pop ? "text-[#9A3412]" : ""}`}>{p.name}</div><div className="text-[13px] text-[#475569]">{line}</div></div>
            <span className="font-mono font-semibold">{money(p.price_month, p.currency)}</span>
          </div>
        );
      })}
    </div>
    <div className="hidden gap-4 md:grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
      {plans.map((p) => {
        const pop = p.id === "growth";
        return (
          <div key={p.id} className={`flex flex-col gap-2 rounded-2xl p-6 ${pop ? "border-2 border-[#F97316] bg-[#FFF7ED] !p-[23px]" : "border border-[#EFE4D8]"}`}>
            <span className={`text-sm font-bold ${pop ? "text-[#9A3412]" : "text-[#475569]"}`}>{p.name}</span>
            <span className="text-[34px] font-bold tracking-[-0.03em]">{money(p.price_month, p.currency)} <span className="text-[15px] font-normal text-[#475569]">/ month</span></span>
            <span className="text-sm text-[#475569]">{short && p.id === "starter" ? `${p.sites} websites · ${p.members} team members` : (LINE[p.id] ?? LINE.starter)(p)}</span>
          </div>
        );
      })}
    </div>
    </>
  );
}
