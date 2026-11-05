"use client";

import { usePlans, priceLine } from "@/lib/plans";

export function HomePlans() {
  const cat = usePlans();
  const plans = cat?.plans ?? [];
  const line = (p: (typeof plans)[number]) => [`${p.sites} website${p.sites === 1 ? "" : "s"}`, `${p.members} team member${p.members === 1 ? "" : "s"}`,
    p.sms ? "SMS alerts" : p.clean_reports ? "clean reports" : "watermarked report"].join(" · ");
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {plans.map((p) => (
        <div key={p.id} className="flex flex-col gap-2 rounded-xl border border-line p-6">
          <h3 className="text-base font-semibold">{p.name}</h3>
          <p className="text-[28px] font-semibold">{priceLine(p, false)} <span className="text-sm font-normal text-muted">/ month</span></p>
          <p className="text-sm text-ink-2">{line(p)}</p>
        </div>
      ))}
    </div>
  );
}
