"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import type { PlanInfo } from "@/lib/api";
import { money } from "@/lib/me";

const AUDIT_PAGES: Record<string, string> = { freelance: "15", starter: "25", growth: "50", scale: "100" };
const SUPPORT: Record<string, string> = { freelance: "Help centre", starter: "Email", growth: "Priority email", scale: "WhatsApp" };
const CTA: Record<string, string> = { freelance: "Choose Freelance", starter: "Choose Starter", growth: "Choose Growth", scale: "Choose Scale" };

type Cell = { text: string; mono?: boolean; strong?: boolean } | { yes: boolean; note?: string };
type Group = { title: string; rows: { label: string; cell: (p: PlanInfo) => Cell }[] };

const GROUPS: Group[] = [
  { title: "Usage", rows: [
    { label: "Websites", cell: (p) => ({ text: String(p.sites), mono: true }) },
    { label: "Team members", cell: (p) => ({ text: String(p.members), mono: true }) },
    { label: "Pages crawled in each audit", cell: (p) => ({ text: AUDIT_PAGES[p.id] ?? "50", mono: true }) },
    { label: "History kept", cell: (p) => ({ text: `${p.history_months} month${p.history_months === 1 ? "" : "s"}` }) },
  ] },
  { title: "Monitoring", rows: [
    { label: "Check frequency", cell: (p) => ({ text: `Every ${p.interval_minutes} minute${p.interval_minutes === 1 ? "" : "s"}`, strong: p.interval_minutes === 1 }) },
  ] },
  { title: "Alerts", rows: [
    { label: "Email alerts", cell: () => ({ yes: true }) },
    { label: "Chat alerts (Slack, Teams)", cell: (p) => ({ yes: p.channels.includes("chat") }) },
  ] },
  { title: "Reports", rows: [
    { label: "Monthly PDF report", cell: (p) => ({ text: "Your logo on every page" }) },
  ] },
  { title: "Team and support", rows: [
    { label: "Client viewer access", cell: (p) => ({ yes: p.client_access }) },
    { label: "Support", cell: (p) => ({ text: SUPPORT[p.id] ?? "Email" }) },
  ] },
];

function Value({ c }: { c: Cell }) {
  if ("yes" in c) {
    return c.yes ? (
      <span className="inline-flex items-center gap-2.5 font-semibold text-[#166534]"><span className="flex size-[22px] items-center justify-center rounded-full bg-[#DCFCE7]"><Check size={14} strokeWidth={3} aria-hidden="true" /></span>Included{c.note && <span className="font-normal text-[#475569]">· {c.note}</span>}</span>
    ) : (
      <span className="inline-flex items-center gap-2.5 text-[#64748B]"><span className="flex size-[22px] items-center justify-center rounded-full bg-[#E2E8F0] text-[#64748B]"><X size={13} strokeWidth={3} aria-hidden="true" /></span>Not available</span>
    );
  }
  return <span className={`${c.mono ? "font-mono font-semibold" : ""} ${c.strong ? "font-semibold" : ""}`}>{c.text}</span>;
}

/** The "Compare plans" table: grouped rows, the Growth column highlighted, a sign-up button under each plan. */
export function ComparePlans({ plans, yearly }: { plans: PlanInfo[]; yearly: boolean }) {
  const hot = (p: PlanInfo) => p.id === "growth";
  const tint = (p: PlanInfo) => (hot(p) ? "bg-[#FFF7ED]" : "");
  const price = (p: PlanInfo) => (yearly ? p.price_year : p.price_month);
  return (
    <section aria-labelledby="compare-title" className="mx-auto flex max-w-[1320px] flex-col gap-6 px-6 pb-12 pt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2"><h2 id="compare-title" className="text-[clamp(32px,4vw,48px)] font-bold leading-[1.05] tracking-[-0.035em]">Compare plans</h2>
          <p className="text-lg text-[#475569]">See exactly what each plan includes, and what it does not.</p></div>
        <div className="flex items-center gap-5 text-sm font-semibold" aria-hidden="true">
          <span className="inline-flex items-center gap-2 text-[#166534]"><span className="flex size-[22px] items-center justify-center rounded-full bg-[#DCFCE7]"><Check size={14} strokeWidth={3} /></span>Included</span>
          <span className="inline-flex items-center gap-2 text-[#64748B]"><span className="flex size-[22px] items-center justify-center rounded-full bg-[#E2E8F0]"><X size={13} strokeWidth={3} /></span>Not available</span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-[#EFE4D8] bg-white">
        <table className="w-full min-w-[920px] border-collapse text-base">
          <thead>
            <tr>
              <th scope="col" className="w-[30%] px-7 pb-5 pt-9 text-left text-sm font-semibold text-[#475569]">Features</th>
              {plans.map((p) => (
                <th key={p.id} scope="col" className={`px-[22px] pb-5 pt-9 text-left align-bottom ${tint(p)} ${hot(p) ? "border-t-4 border-[#F97316]" : "border-t-4 border-transparent"}`}>
                  <div className={`text-lg font-bold ${hot(p) ? "text-[#9A3412]" : ""}`}>{p.name}</div>
                  <div className="whitespace-nowrap"><span className="font-mono text-xl font-semibold">{money(price(p), p.currency)}</span><span className="text-[13px] font-normal text-[#475569]"> / {yearly ? "year" : "month"}</span></div>
                  {yearly && <div className="whitespace-nowrap text-[13px] font-normal text-[#475569]">{money(p.price_year_month, p.currency)} a month</div>}
                </th>
              ))}
            </tr>
          </thead>
          {GROUPS.map((g) => (
            <tbody key={g.title} className="border-t-2 border-[#EFE4D8]">
              <tr><th colSpan={plans.length + 1} scope="colgroup" className="px-7 pb-3 pt-6 text-left text-xs font-bold uppercase tracking-[0.1em] text-[#C2410C]">{g.title}</th></tr>
              {g.rows.map((r) => (
                <tr key={r.label} className="border-t border-[#EFE4D8]">
                  <th scope="row" className="px-7 py-[18px] text-left font-medium">{r.label}</th>
                  {plans.map((p) => <td key={p.id} className={`px-[22px] py-[18px] ${tint(p)}`}><Value c={r.cell(p)} /></td>)}
                </tr>
              ))}
            </tbody>
          ))}
          <tfoot>
            <tr className="border-t-2 border-[#EFE4D8]">
              <td className="px-7 py-6" />
              {plans.map((p) => (
                <td key={p.id} className={`px-[22px] py-6 ${tint(p)}`}>
                  <Link href={`/signup?plan=${p.id}&cycle=${yearly ? "yearly" : "monthly"}`}
                    className={`block rounded-xl py-3.5 text-center text-base font-bold ${hot(p) ? "bg-[#F97316] text-white hover:bg-[#EA580C]" : "border-[1.5px] border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white"}`}>{CTA[p.id] ?? `Choose ${p.name}`}</Link>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
