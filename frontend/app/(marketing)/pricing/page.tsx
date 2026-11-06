"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { ComparePlans } from "@/components/compare-plans";
import { Container, CtaBand, Rings } from "@/components/mkt";
import { eyebrow } from "@/lib/mkt-styles";
import type { PlanInfo } from "@/lib/api";
import { ghs } from "@/lib/me";
import { usePlans } from "@/lib/plans";

const TAGLINE: Record<string, string> = { free: "Try SiteRadar on one site", starter: "For a small business or freelancer", growth: "For agencies with a client list", scale: "For larger teams and portfolios" };
const CTA: Record<string, string> = { free: "Start free", starter: "Choose Starter", growth: "Choose Growth", scale: "Choose Scale" };
const AUDIT_PAGES: Record<string, string> = { free: "10", starter: "25", growth: "50", scale: "100" };
const SUPPORT: Record<string, string> = { free: "Help centre", starter: "Email", growth: "Priority email", scale: "WhatsApp" };

function features(p: PlanInfo): string[] {
  const out = [
    `${p.sites} website${p.sites === 1 ? "" : "s"}`, `${p.members} team member${p.members === 1 ? "" : "s"}`,
    `Checks every ${p.interval_minutes === 1 ? "minute" : `${p.interval_minutes} minutes`}`,
    p.channels.includes("chat") ? "Email, Slack and Teams alerts" : "Email alerts only",
  ];
  if (p.sms) out.push(`${p.sms} SMS alerts a month`);
  out.push("Domain, SSL, DNS and sitemap monitoring", "Daily audit, " + (AUDIT_PAGES[p.id] ?? "50") + " pages crawled",
    p.clean_reports ? "Monthly report with your logo, no watermark" : "Monthly report with a light watermark", "Your logo on every report", "Subscriptions and invoices tracker");
  if (p.client_access) out.push("Read-only viewer access for clients");
  out.push(`${p.history_months} month${p.history_months === 1 ? "" : "s"} of history`, `${SUPPORT[p.id] ?? "Email"} support`);
  return out;
}

const faq = [
  ["Is the Free plan really free?", "Yes. It is free for ever and you do not need a card to sign up."],
  ["Will I get woken up by a blip?", "No. Alerts only fire after two failed checks in a row, and you hear again when the site is back."],
  ["Do I need a cookie banner for the analytics?", "No. The tracking script is tiny and cookieless, and installing it is optional."],
  ["Can my clients see their own site?", "Yes. Invite them as read-only viewers, or simply send them the monthly PDF report."],
  ["How do I pay?", "By card or mobile money through Paystack. Cards renew automatically. With mobile money we email you a payment link before each renewal."],
  ["What if a renewal payment fails?", "Your plan stays active for 7 days while we ask you to pay. After that the account drops to Free limits. Nothing is deleted, and upgrading again restores everything."],
];

export default function Pricing() {
  const cat = usePlans();
  const [yearly, setYearly] = useState(false);
  const plans = cat?.plans ?? [];
  const disc = cat?.yearly_discount ?? 20;
  const tab = (on: boolean) => `flex min-h-11 items-center gap-2 rounded-lg px-5 text-sm font-bold ${on ? "bg-[#F97316] text-white" : "text-[#CBD5E1] hover:text-white"}`;

  return (
    <>
      <section className="relative overflow-hidden bg-[#0F172A] text-white">
        <Rings className="-right-[260px] -top-[180px] size-[900px]" />
        <Container className="relative flex flex-col items-center gap-4 pb-[150px] pt-20 text-center">
          <span className={`${eyebrow} text-[#FDBA74]`}>Pricing</span>
          <h1 className="max-w-[760px] text-[clamp(36px,4.6vw,58px)] font-bold leading-[1.05] tracking-[-0.035em]">Start free, upgrade when you grow.</h1>
          <p className="max-w-[600px] text-[19px] text-[#CBD5E1]">Simple plans in Ghana cedis. The Free plan is free for ever, and no card is needed.</p>
          <div role="group" aria-label="Billing period" className="mt-3 inline-flex gap-1 rounded-xl border border-[#334155] bg-[#1E293B] p-1">
            <button aria-pressed={!yearly} onClick={() => setYearly(false)} className={tab(!yearly)}>Monthly</button>
            <button aria-pressed={yearly} onClick={() => setYearly(true)} className={tab(yearly)}>Yearly <span className={`rounded-full px-2 py-0.5 text-xs ${yearly ? "bg-[#0F172A]/15" : "bg-[#F97316]/20 text-[#FDBA74]"}`}>Save {disc}%</span></button>
          </div>
        </Container>
      </section>

      <Container className="relative -mt-24">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
          {plans.map((p) => {
            const pop = p.id === "growth", free = p.price_month === 0;
            return (
              <div key={p.id} className={`flex flex-col gap-4 rounded-[20px] ${pop ? "border-2 border-[#F97316] bg-[#FFF7ED] p-[27px] shadow-[0_20px_40px_rgba(124,45,18,0.15)]" : "border border-[#EFE4D8] bg-white p-7 shadow-[0_20px_40px_rgba(15,23,42,0.08)]"}`}>
                <div className="flex flex-col gap-1"><span className={`text-base font-bold ${pop ? "text-[#9A3412]" : ""}`}>{p.name}</span><span className="text-sm text-[#475569]">{TAGLINE[p.id] ?? p.tagline}</span></div>
                <div><span className="font-mono text-[40px] font-semibold tracking-[-0.03em]">{free ? "GHS 0" : ghs(yearly ? Math.round(p.price_year_month) : p.price_month)}</span><span className="text-[15px] text-[#475569]"> / month</span>
                  {!free && yearly && <div className="mt-1 text-[13px] text-[#475569]">Billed {ghs(p.price_year)} a year</div>}</div>
                <Link href={`/signup?plan=${p.id}&cycle=${yearly ? "yearly" : "monthly"}`} className={`rounded-xl py-3.5 text-center font-bold ${pop ? "bg-[#F97316] text-white hover:bg-[#EA580C]" : "border-[1.5px] border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white"}`}>{CTA[p.id] ?? `Choose ${p.name}`}</Link>
                <ul className="flex flex-col gap-2.5 text-[15px] text-[#334155]">{features(p).map((b) => <li key={b} className="flex gap-2.5"><Check size={18} strokeWidth={2.6} className="mt-0.5 flex-none text-[#F97316]" aria-hidden="true" />{b}</li>)}</ul>
              </div>
            );
          })}
        </div>
      </Container>

      <ComparePlans plans={plans} yearly={yearly} />

      <Container className="flex flex-wrap gap-12 pb-24 pt-12">
        <h2 className="min-w-[280px] flex-[1_1_280px] text-[clamp(28px,3.2vw,40px)] font-bold leading-[1.1] tracking-[-0.03em]">Questions</h2>
        <div className="flex min-w-0 flex-[2_1_520px] flex-col border-b border-[#EFE4D8]">
          {faq.map(([q, a]) => <div key={q} className="border-t border-[#EFE4D8] py-5"><h3 className="mb-1.5 text-lg font-bold">{q}</h3><p className="text-[#475569]">{a}</p></div>)}
        </div>
      </Container>

      <CtaBand title="Need more than 50 websites?" text="Tell us about your portfolio and we will put a plan together." primary={{ href: "/contact", label: "Contact us" }} />
    </>
  );
}
