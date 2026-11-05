"use client";

import Link from "next/link";
import { useState } from "react";
import { CtaBand, Section } from "@/components/mkt";
import { Icon } from "@/components/ui";
import type { PlanInfo } from "@/lib/api";
import { ghs } from "@/lib/me";
import { channelLabel, planFeatures, priceLine, usePlans } from "@/lib/plans";

const AUDIT_PAGES: Record<string, string> = { free: "10", starter: "25", growth: "50", scale: "100" };
const SUPPORT: Record<string, string> = { free: "Help centre", starter: "Email", growth: "Priority email", scale: "WhatsApp" };

const faq = [
  ["Is the Free plan really free?", "Yes, for ever, with no card. It covers one website with email alerts and a monthly report. The report carries a light SiteRadar watermark, which disappears on any paid plan."],
  ["How do I pay for a paid plan?", "By card or by mobile money through Paystack, at the time you choose the plan. Cards renew automatically. With mobile money we email you a payment link before each renewal, which you approve on your phone."],
  ["How much do I save by paying yearly?", "Yearly billing is cheaper than paying month by month. You pay once for the year and can switch back to monthly when it renews."],
  ["Can I change plan later?", "Yes, any time from Billing. Upgrades apply straight away. Moving down to Free applies straight away too, and websites above the Free limit are paused, not deleted."],
  ["What happens if I reach my website limit?", "Your existing sites keep running. You will not be able to add another until you upgrade or remove one."],
  ["What if a renewal payment fails?", "Your plan stays active for 7 days while we ask you to pay. After that the workspace drops to Free limits. Nothing is deleted, and upgrading again restores everything."],
];

export default function Pricing() {
  const cat = usePlans();
  const [yearly, setYearly] = useState(false);
  const plans = cat?.plans ?? [];
  const disc = cat?.yearly_discount ?? 20;
  const tab = (on: boolean) => `flex min-h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold ${on ? "bg-brand text-white" : "text-ink-2 hover:bg-soft"}`;

  const rows: [string, (p: PlanInfo) => string][] = [
    ["Websites", (p) => String(p.sites)], ["Team members", (p) => String(p.members)],
    ["Check interval", (p) => `${p.interval_minutes} minute${p.interval_minutes === 1 ? "" : "s"}`],
    ["Alert channels", (p) => (p.channels.includes("chat") ? "Email and chat" : "Email")],
    ["SMS alerts per month", (p) => (p.sms ? String(p.sms) : "No")],
    ["Monthly PDF report", (p) => (p.clean_reports ? "Clean" : "Watermarked")], ["Your logo on reports", () => "Yes"],
    ["Client viewer access", (p) => (p.client_access ? "Yes" : "No")],
    ["Pages crawled in each audit", (p) => AUDIT_PAGES[p.id] ?? "50"],
    ["History kept", (p) => `${p.history_months} month${p.history_months === 1 ? "" : "s"}`],
    ["Support", (p) => SUPPORT[p.id] ?? "Email"],
  ];

  return (
    <>
      <Section tone="soft" className="!py-14 lg:!py-20">
        <div className="mx-auto flex max-w-[760px] flex-col items-center gap-5 text-center">
          <h1 className="text-[44px] font-bold leading-[1.04] tracking-[-0.035em] lg:text-[64px]">Start free, upgrade when you grow</h1>
          <p className="text-lg leading-relaxed text-ink-2">Prices in Ghana cedis. Every plan includes the same checks and the subscriptions tracker. You choose how many websites and people.</p>
          <div role="group" aria-label="Billing period" className="mt-2 inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
            <button aria-pressed={!yearly} onClick={() => setYearly(false)} className={tab(!yearly)}>Monthly</button>
            <button aria-pressed={yearly} onClick={() => setYearly(true)} className={tab(yearly)}>Yearly <span className={`rounded-full px-2 py-0.5 text-xs ${yearly ? "bg-white/20" : "bg-ok-soft text-ok"}`}>Save {disc}%</span></button>
          </div>
        </div>
      </Section>

      <Section className="!pt-4">
        <div className="-mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const popular = p.id === "growth", free = p.price_month === 0;
            return (
              <div key={p.id} className={`relative flex flex-col gap-4 rounded-2xl bg-surface p-6 shadow-sm ${popular ? "border-2 border-brand" : "border border-line"}`}>
                {popular && <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">Most popular</span>}
                <div><h2 className="text-xl font-bold tracking-[-0.015em]">{p.name}</h2><p className="mt-1 min-h-10 text-sm text-ink-2">{p.tagline}</p></div>
                <div>
                  <p className="text-[34px] font-semibold leading-none">{priceLine(p, yearly)} <span className="text-sm font-normal text-muted">{free ? "for ever" : "/ month"}</span></p>
                  <p className="mt-1.5 text-[13px] text-muted">{free ? "No card needed" : yearly ? `Billed ${ghs(p.price_year)} a year` : "Billed monthly"}</p>
                </div>
                <Link href={`/signup?plan=${p.id}&cycle=${yearly ? "yearly" : "monthly"}`}
                  className={`flex min-h-12 items-center justify-center rounded-lg text-[15px] font-semibold ${popular ? "bg-brand text-white hover:bg-brand-hover" : "border border-[#c9cfd8] hover:bg-soft"}`}>
                  {free ? "Get started free" : `Choose ${p.name}`}
                </Link>
                <ul className="flex flex-col gap-2.5 text-sm">{planFeatures(p).map((f) => <li key={f} className="flex gap-2.5"><Icon.check className="mt-0.5 shrink-0 text-ok" />{f}</li>)}</ul>
              </div>
            );
          })}
        </div>
      </Section>

      <Section tone="soft">
        <h2 className="mb-8 text-center text-[36px] font-bold leading-[1.1] tracking-[-0.03em] lg:text-[46px]">Compare the plans</h2>
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead><tr className="border-b border-line bg-soft"><th className="px-5 py-3.5"><span className="sr-only">Feature</span></th>{plans.map((p) => <th key={p.id} className="px-5 py-3.5 font-semibold">{p.name}</th>)}</tr></thead>
            <tbody>{rows.map(([label, fn]) => (
              <tr key={label} className="border-b border-line-soft last:border-0"><th scope="row" className="px-5 py-3.5 font-medium">{label}</th>{plans.map((p) => <td key={p.id} className="px-5 py-3.5 text-ink-2">{fn(p)}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
        <p className="mt-5 text-center text-sm text-muted">Prices are in Ghana cedis. Need more than 50 websites? <Link href="/contact" className="font-semibold text-brand">Talk to us.</Link></p>
      </Section>

      <Section>
        <h2 className="mb-8 text-center text-[36px] font-bold leading-[1.1] tracking-[-0.03em] lg:text-[46px]">Questions</h2>
        <div className="mx-auto flex max-w-[800px] flex-col gap-3">
          {faq.map(([q, a]) => (
            <details key={q} className="group rounded-xl border border-line p-5">
              <summary className="flex min-h-8 items-center justify-between gap-4 text-base font-semibold">{q}<Icon.chevronDown className="shrink-0 transition-transform group-open:rotate-180" /></summary>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </Section>
      <CtaBand title="Start with the Free plan" text="Add your first website in a couple of minutes. Upgrade whenever you need more." />
    </>
  );
}
