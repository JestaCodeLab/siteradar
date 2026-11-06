"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { ComparePlans } from "@/components/compare-plans";
import { Container, CtaBand, Rings } from "@/components/mkt";
import { eyebrow } from "@/lib/mkt-styles";
import type { PlanInfo } from "@/lib/api";
import { money } from "@/lib/me";
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

/** What a plan leaves out, for the phone layout where the comparison table is replaced by a list on each card. */
function missing(p: PlanInfo): string[] {
  const out: string[] = [];
  if (!p.sms) out.push("SMS alerts");
  if (!p.clean_reports) out.push("Reports without a watermark");
  if (p.interval_minutes > 1) out.push("1-minute checks");
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
        <Rings className="-right-[260px] -top-[180px] hidden size-[900px] md:block" />
        <Container className="relative flex flex-col items-start gap-3 pb-[88px] pt-10 text-left md:items-center md:gap-4 md:pb-[150px] md:pt-20 md:text-center">
          <span className={`${eyebrow} text-[#FDBA74]`}>Pricing</span>
          <h1 className="max-w-[760px] text-[28px] font-bold leading-[1.12] tracking-[-0.025em] md:text-[clamp(36px,4.6vw,58px)] md:font-bold md:leading-[1.05] md:tracking-[-0.035em]">Monitoring Plans for Every Business.</h1>
          <p className="max-w-[600px] text-base text-[#CBD5E1] md:text-[19px]">Clear monthly pricing in {plans[0]?.currency === "USD" ? "US dollars" : "Ghana cedis"}.<span className="hidden md:inline"> Choose the plan that fits the websites you look after, and move up as you grow.</span></p>
          <div role="group" aria-label="Billing period" className="mt-2 inline-flex gap-1 md:mt-3 rounded-xl border border-[#334155] bg-[#1E293B] p-1">
            <button aria-pressed={!yearly} onClick={() => setYearly(false)} className={tab(!yearly)}>Monthly</button>
            <button aria-pressed={yearly} onClick={() => setYearly(true)} className={tab(yearly)}>Yearly <span className={`rounded-full px-2 py-0.5 text-xs ${yearly ? "bg-[#0F172A]/15" : "bg-[#F97316]/20 text-[#FDBA74]"}`}>Save {disc}%</span></button>
          </div>
        </Container>
      </section>

      <Container className="relative -mt-16 md:-mt-24">
        <div className="grid gap-4 md:[grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
          {plans.map((p) => {
            const pop = p.id === "growth", free = p.price_month === 0;
            return (
              <div key={p.id} className={`flex flex-col gap-4 rounded-[20px] ${pop ? "border-2 border-[#F97316] bg-[#FFF7ED] p-[27px] shadow-[0_20px_40px_rgba(124,45,18,0.15)]" : "border border-[#EFE4D8] bg-white p-7 shadow-[0_20px_40px_rgba(15,23,42,0.08)]"}`}>
                <div className="flex flex-col gap-1"><span className={`text-xl font-bold ${pop ? "text-[#9A3412]" : ""}`}>{p.name}</span><span className="text-sm text-[#475569]">{TAGLINE[p.id] ?? p.tagline}</span></div>
                <div className="whitespace-nowrap"><span className={`font-mono font-semibold tracking-[-0.03em] text-[30px] lg:text-[26px] min-[1280px]:text-[34px]`}>{free ? money(0, p.currency) : money(yearly ? p.price_year : p.price_month, p.currency)}</span><span className="text-sm text-[#475569]"> / {!free && yearly ? "year" : "month"}</span>
                  {!free && yearly && <div className="mt-1 text-[13px] text-[#475569]">{money(Math.round(p.price_year_month), p.currency)} a month, billed yearly</div>}</div>
                <Link href={`/signup?plan=${p.id}&cycle=${yearly ? "yearly" : "monthly"}`} className={`rounded-xl py-3.5 text-center font-bold ${pop ? "bg-[#F97316] text-white hover:bg-[#EA580C]" : "border-[1.5px] border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white"}`}>{CTA[p.id] ?? `Choose ${p.name}`}</Link>
                <ul className="flex flex-col gap-2.5 text-[15px] text-[#334155]">{features(p).map((b) => <li key={b} className="flex gap-2.5"><span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-[#DCFCE7] md:size-auto md:bg-transparent"><Check size={14} strokeWidth={2.8} className="text-[#15803D] md:size-[18px] md:text-[#F97316]" aria-hidden="true" /></span>{b}</li>)}
                  {missing(p).map((b) => <li key={b} className="flex gap-2.5 text-[#64748B] md:hidden"><span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-[#F1F5F9]"><X size={12} strokeWidth={2.6} className="text-[#94A3B8]" aria-hidden="true" /></span><span className="flex-1">{b}</span><span className="text-xs font-semibold">Not available</span></li>)}</ul>
              </div>
            );
          })}
        </div>
      </Container>

      <div className="hidden md:block"><ComparePlans plans={plans} yearly={yearly} /></div>

      <Container className="flex flex-wrap gap-4 pb-12 pt-9 md:gap-12 md:pb-24 md:pt-12">
        <h2 className="min-w-[280px] flex-[1_1_280px] text-xl font-bold leading-[1.1] tracking-[-0.02em] md:text-[clamp(28px,3.2vw,40px)] md:font-bold md:tracking-[-0.03em]">Questions</h2>
        <div className="flex min-w-0 flex-[2_1_520px] flex-col border-b border-[#EFE4D8]">
          <div className="md:hidden">{faq.map(([q, a]) => <details key={q} className="group border-t border-[#EFE4D8] py-3.5"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 marker:hidden [&::-webkit-details-marker]:hidden"><h3 className="text-base font-bold">{q}</h3><span aria-hidden="true" className="text-[#C2410C] group-open:hidden">+</span><span aria-hidden="true" className="hidden text-[#C2410C] group-open:inline">−</span></summary><p className="mt-2 text-[15px] text-[#475569]">{a}</p></details>)}</div>
          <div className="hidden md:block">{faq.map(([q, a]) => <div key={q} className="border-t border-[#EFE4D8] py-5"><h3 className="mb-1.5 text-lg font-bold">{q}</h3><p className="text-[#475569]">{a}</p></div>)}</div>
        </div>
      </Container>

      <CtaBand title="Need more than 50 websites?" text="Tell us about your portfolio and we will put a plan together." primary={{ href: "/contact", label: "Contact us" }} />
    </>
  );
}
