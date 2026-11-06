import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbs } from "@/lib/seo";
import type { Metadata } from "next";
import { Bell, CalendarDays, Check, SearchCheck, Users } from "lucide-react";
import { Container, CtaBand } from "@/components/mkt";
import { SolutionPlans } from "@/components/solution-plans";
import { btnOrange, btnOutlineInk, card, eyebrow, h2, h2Small, iconTile, monoLabel } from "@/lib/mkt-styles";

export const metadata: Metadata = pageMeta({
  title: "Client monitoring for agencies",
  absoluteTitle: "Client Monitoring & Reporting for Agencies | SiteRadar",
  description: "Monitor client websites, track social media campaigns and post performance, and generate professional reports with SiteRadar for agencies.",
  ogTitle: "Smart Client Monitoring for Digital Agencies | SiteRadar",
  ogDescription: "Manage client websites, monitor performance, catch issues early and deliver professional reports with SiteRadar.",
  path: "/agencies",
  image: "/og/og-agencies.png",
});

const clients = [["Shop", "shop.example.com", "Up"], ["Jesta Digital Solutions", "jestadigitalsolutions.com", "Slow"], ["Church", "church.example.org", "Up"], ["Blog", "blog.example.com", "Up"]];
const who = [
  ["Digital marketing agencies", "#F97316", "Show results every month. Cookieless visitor analytics, an SEO and speed audit, and a client-ready PDF that explains what changed and what to do next."],
  ["Web development agencies", "#FBA23C", "Care plans that run themselves after launch. Uptime, SSL, domain and DNS change alerts, plus a daily audit of about 50 checks for every site you build."],
  ["Consultants", "#7C2D12", "Look after a handful of clients like a full team would. Reports carry your logo, and alerts reach you on SMS, email, Slack or Teams."],
];
const grid = [
  { Icon: CalendarDays, t: "Renewals on autopilot", d: "Every client’s domains, hosting and tools with renewal dates, reminders, invoice PDFs and a monthly spend report." },
  { Icon: Bell, t: "Alerts before the client calls", d: "SMS, email, Slack or Teams, only after two failed checks, so your team is not chasing blips." },
  { Icon: SearchCheck, t: "Upsell with evidence", d: "The daily audit turns about 50 checks into a prioritised fix list, a ready-made scope for your next piece of work." },
  { Icon: Users, t: "The right access for everyone", d: "Full admins, team members and read-only client viewers, each seeing exactly what they should." },
];

export default function Agencies() {
  return (
    <>
      <JsonLd data={breadcrumbs([["Home", "/"], ["For agencies", "/agencies"]])} />
      {/* hero: light */}
      <section className="relative overflow-hidden border-b border-[#F5E6D3] bg-[#FFF7ED]">
        <svg viewBox="0 0 600 600" aria-hidden="true" className="pointer-events-none absolute -bottom-[380px] -left-[300px] size-[760px]"><g fill="none" stroke="#F97316" strokeWidth="2"><circle cx="300" cy="300" r="100" strokeOpacity="0.3" /><circle cx="300" cy="300" r="190" strokeOpacity="0.2" /><circle cx="300" cy="300" r="280" strokeOpacity="0.1" /></g></svg>
        <Container className="relative flex flex-wrap items-center gap-14 py-[88px]">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-5">
            <span className={`${eyebrow} self-start rounded-full bg-[#FFEDD5] px-3 py-1.5 text-[#9A3412]`}>Solutions for agencies</span>
            <h1 className="text-[clamp(36px,4.6vw,58px)] font-bold leading-[1.05] tracking-[-0.035em]">Every client website and campaign, on one radar.</h1>
            <p className="text-[19px] text-[#475569]">For digital marketing agencies, web development agencies and consultants managing multiple clients. Catch problems before your clients call, and prove the value of your work every month.</p>
            <div className="flex flex-wrap gap-3"><Link href="/signup" className={btnOrange}>Get started</Link><Link href="/contact" className={btnOutlineInk}>Talk to us</Link></div>
          </div>
          <div role="img" aria-label="Agency client list: four client websites, three up and one slow, with an SSL certificate expiring in 28 days"
            className="flex min-w-0 flex-[1_1_440px] flex-col gap-3 rounded-[20px] border border-[#EFE4D8] bg-white p-6 shadow-[0_24px_60px_rgba(124,45,18,0.14)]">
            <div className="flex justify-between text-sm"><span className="font-bold">Your clients</span><span className="font-mono text-[#475569]">3 up · 1 slow</span></div>
            {clients.map(([n, h, s]) => (
              <div key={n} className="flex items-center justify-between gap-3 rounded-xl border border-[#EFE4D8] px-3.5 py-3"><div className="min-w-0"><div className="font-semibold">{n}</div><div className="truncate font-mono text-[13px] text-[#475569]">{h}</div></div>
                <span className={`rounded-full px-2.5 py-[3px] text-xs font-bold ${s === "Slow" ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#DCFCE7] text-[#166534]"}`}>{s}</span></div>))}
            <div className="flex items-center gap-2.5 rounded-xl bg-[#FFF7ED] px-3.5 py-3 text-sm"><span className="font-mono font-semibold text-[#C2410C]">28 d</span><span>SSL expires on shop.example.com · alert sent</span></div>
          </div>
        </Container>
      </section>

      {/* who */}
      <Container className="flex flex-col gap-10 py-24">
        <div className="flex max-w-[720px] flex-col gap-3"><span className={`${eyebrow} text-[#C2410C]`}>Built for the way agencies work</span><h2 className={h2}>However you serve your clients, SiteRadar keeps watch.</h2></div>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {who.map(([t, c, d]) => <div key={t} style={{ borderTopColor: c }} className="flex flex-col gap-3 rounded-2xl border border-t-4 border-[#EFE4D8] bg-white p-7"><h3 className="text-[21px] font-bold">{t}</h3><p className="text-base text-[#475569]">{d}</p></div>)}
        </div>
      </Container>

      {/* reports */}
      <section className="border-y border-[#EFE4D8] bg-white">
        <Container className="flex flex-wrap-reverse items-center gap-14 py-24">
          <div role="img" aria-label="Monthly client report with the agency's logo, showing uptime 99.97%, 4,212 visitors and a health score of 81"
            className="flex min-w-0 flex-[1_1_440px] flex-col gap-[18px] rounded-[20px] border border-[#EFE4D8] bg-white p-7 shadow-[0_20px_50px_rgba(124,45,18,0.12)]">
            <div className="flex items-center justify-between gap-3 border-b-[3px] border-[#F97316] pb-3.5">
              <div className="flex flex-col gap-0.5"><span className="text-xs font-bold tracking-[0.08em] text-[#475569]">MONTHLY REPORT · OCTOBER 2026</span><span className="text-[22px] font-bold tracking-[-0.02em]">shop.example.com</span></div>
              <span className="rounded-lg border-[1.5px] border-dashed border-[#CBD5E1] px-3 py-2.5 text-xs font-bold text-[#475569]">YOUR LOGO</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">{[["Uptime", "99.97%"], ["Visitors", "4,212"], ["Health", "81"]].map(([k, v]) => <div key={k} className="rounded-xl bg-[#FFF7ED] p-3"><div className="text-xs text-[#475569]">{k}</div><div className="font-mono text-[22px] font-semibold">{v}</div></div>)}</div>
            <div className="flex flex-col gap-2.5"><span className="text-sm font-bold">What to do next</span>
              <div className="flex items-center gap-2.5 text-sm"><span className="rounded-full bg-[#FEE2E2] px-2.5 py-[3px] text-[11px] font-bold text-[#991B1B]">Fix</span>Add a DMARC record to protect your email</div>
              <div className="flex items-center gap-2.5 text-sm"><span className="rounded-full bg-[#FEF3C7] px-2.5 py-[3px] text-[11px] font-bold text-[#92400E]">Soon</span>Compress 9 large images</div></div>
          </div>
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
            <span className={monoLabel}>Client reporting</span>
            <h2 className={h2Small}>A report with your name on it, sent on the 1st.</h2>
            <p className="text-lg text-[#475569]">Every client gets a clean PDF covering uptime, incidents, speed, visitors, domain and DNS health, with a short list of what to do next in plain language.</p>
            <ul className="flex flex-col gap-3">{["Your agency logo, and no watermark on paid plans", "Sent to your client, your team, or both", "Read-only access for clients who want to look for themselves"].map((t) => (
              <li key={t} className="flex gap-3"><Check size={22} strokeWidth={2.4} className="mt-0.5 flex-none text-[#F97316]" aria-hidden="true" /><span>{t}</span></li>))}</ul>
          </div>
        </Container>
      </section>

      {/* features */}
      <Container className="flex flex-col gap-10 py-24">
        <h2 className={`${h2} max-w-[720px]`}>Run client care without the spreadsheet.</h2>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {grid.map(({ Icon, t, d }) => <div key={t} className={card}><span className={iconTile}><Icon size={22} aria-hidden="true" /></span><h3 className="text-lg font-bold">{t}</h3><p className="text-[15px] text-[#475569]">{d}</p></div>)}
        </div>
      </Container>

      <SolutionPlans variant="agencies" eyebrowText="Plans for agencies" title="Grow your client list without growing your workload." />
      <CtaBand title="Put every client on the radar." text="Start free with one site, then move your whole client list across when you are ready." primary={{ href: "/signup", label: "Get started" }} secondary={{ href: "/contact", label: "Talk to us" }} onPage />
    </>
  );
}
