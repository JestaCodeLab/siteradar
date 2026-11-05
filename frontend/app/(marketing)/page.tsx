import Link from "next/link";
import type { Metadata } from "next";
import { Activity, BarChart3, FileText, Mail, ListChecks, Receipt, ShieldCheck, Users } from "lucide-react";
import { btnOrange, btnOutlineDark, Container, CtaBand, eyebrow, h2, iconTile, card, Rings } from "@/components/mkt";
import { HomePlans } from "@/components/home-plans";

export const metadata: Metadata = { title: "Know when your websites break, expire or slow down" };

const slow = [12, 21, 28];
const features = [
  { Icon: Activity, title: "Uptime and speed", text: "Every site is checked every few minutes for availability and response time, with a text or email only when it really matters." },
  { Icon: ShieldCheck, title: "SSL and domain expiry", text: "See the exact expiry date of every certificate and domain, and get warned weeks ahead instead of the day it lapses." },
  { Icon: Mail, title: "DNS and email health", text: "We check SPF, DKIM and DMARC and alert you when DNS records change, so email lands in the inbox and hijacks are caught." },
  { Icon: ListChecks, title: "Daily site audit", text: "About 50 checks across SEO, speed, security and accessibility, each with a plain-language fix." },
  { Icon: BarChart3, title: "Visitor analytics", text: "A tiny cookieless script shows visitors, sources, devices and real page-load times. No cookie banner needed." },
  { Icon: Receipt, title: "Subscriptions and invoices", text: "Track domains, hosting and tools with renewal dates, reminders and the invoice PDFs, with a monthly spend report." },
  { Icon: FileText, title: "Monthly client reports", text: "A clear PDF for every website on the 1st of the month, with a prioritised list of what to do next." },
  { Icon: Users, title: "Your whole team", text: "Invite colleagues with the right access, from full admins to read-only viewers for clients." },
];
const pillars = [["01", "Monitor", "Websites, domains, certificates, DNS and email records, checked around the clock."], ["02", "Understand", "Performance, visitors and audit results in plain language, with trends over time."], ["03", "Act", "Alerts before your customers notice, and a prioritised list of what to fix next."]];
const steps = [["01", "Add your websites", "Paste the address of each site. SiteRadar starts checking straight away and takes a picture of the homepage."], ["02", "Install one line", "Optional: paste a tiny script on each site to see visitors and real page speed."], ["03", "Relax, we will tell you", "Get alerts when something needs attention and a report at the start of every month."]];
const mono = "font-mono";

export default function Home() {
  return (
    <>
      {/* hero */}
      <section className="relative overflow-hidden bg-[#0F172A] text-white">
        <Rings className="-right-[260px] -top-[180px] size-[900px]" />
        <Container className="relative flex flex-wrap items-center gap-14 pb-24 pt-[88px]">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-6">
            <span className={`${eyebrow} self-start rounded-full border border-[#FDBA74]/40 px-3 py-1.5 font-semibold text-[#FDBA74]`}>Digital Presence Intelligence</span>
            <h1 className="text-[clamp(38px,5vw,62px)] font-extrabold leading-[1.05] tracking-[-0.035em]">Know when your websites break, expire or slow down.</h1>
            <p className="max-w-[560px] text-[19px] text-[#CBD5E1]">Uptime, SSL and domain expiry, DNS and email health, speed and visitors for every website you look after. Plus a clear monthly report you can send straight to your clients.</p>
            <div className="mt-1 flex flex-wrap gap-3"><Link href="/signup" className={btnOrange}>Get started free</Link><Link href="/pricing" className={btnOutlineDark}>See pricing</Link></div>
            <p className="text-sm text-[#94A3B8]">The Free plan is free for ever. No card needed.</p>
          </div>

          <div role="img" aria-label="SiteRadar dashboard showing a website marked Slow, 99.98% uptime, 6.1 second response time, SSL valid for 74 days and an audit score of 81"
            className="flex min-w-0 flex-[1_1_520px] flex-col gap-4 rounded-[20px] bg-white p-6 text-[#0F172A] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2.5"><span className="text-xl font-bold tracking-[-0.02em]">Jesta Digital Solutions</span><span className="rounded-full bg-[#FEF3C7] px-2.5 py-[3px] text-xs font-bold text-[#92400E]">● Slow</span></div>
                <span className={`${mono} text-[13px] text-[#C2410C]`}>jestadigitalsolutions.com</span>
              </div>
              <span className="text-xs text-[#475569]">Last check 2 minutes ago</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[["Uptime, 30 days", "99.98%", ""], ["Response", "6.1 s", "text-[#B45309]"], ["SSL expires", "74 d", ""], ["Audit score", "81", ""]].map(([k, v, c]) => (
                <div key={k} className="rounded-xl border border-[#EFE4D8] p-3"><div className="text-xs text-[#475569]">{k}</div><div className={`${mono} text-[22px] font-semibold ${c}`}>{v}</div></div>))}
            </div>
            <div className="flex flex-col gap-2"><div className="flex justify-between text-[13px]"><span className="font-semibold">Uptime, last 30 days</span><span className="text-[#475569]">1 incident · 7 min downtime</span></div>
              <div className="flex h-7 gap-[3px]">{Array.from({ length: 30 }, (_, i) => <div key={i} className={`flex-1 rounded-[3px] ${slow.includes(i) ? "bg-[#F59E0B]" : "bg-[#16A34A]"}`} />)}</div></div>
            <div className="flex flex-col gap-1.5"><div className="flex justify-between text-[13px]"><span className="font-semibold">Response time</span><span className="text-[#92400E]">Above the 3 s threshold</span></div>
              <svg viewBox="0 0 300 100" width="100%" height="110" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="62.5" x2="300" y2="62.5" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="5 4" /><polyline fill="none" stroke="#F97316" strokeWidth="2.4" strokeLinejoin="round" points="0,43.75 10.3,42.5 20.7,46.25 31,37.5 41.4,40 51.7,27.5 62.1,32.5 72.4,37.5 82.8,36.25 93.1,22.5 103.4,17.5 113.8,26.25 124.1,37.5 134.5,33.75 144.8,26.25 155.2,30 165.5,40 175.9,37.5 186.2,33.75 196.6,23.75 206.9,15 217.2,27.5 227.6,32.5 237.9,36.25 248.3,38.75 258.6,32.5 269,21.25 279.3,25 289.7,30 300,23.75" /></svg></div>
            <div className="flex flex-col border-t border-[#EFE4D8]">
              {["Security headers missing (CSP, X-Frame-Options)", "9 images are larger than 500 KB"].map((t, i) => (
                <div key={t} className={`flex items-center gap-2.5 py-2.5 ${i === 0 ? "border-b border-[#EFE4D8]" : ""}`}><span className="rounded-full bg-[#FEE2E2] px-2.5 py-[3px] text-[11px] font-bold text-[#991B1B]">High</span><span className="text-sm">{t}</span></div>))}
            </div>
          </div>
        </Container>
      </section>

      {/* pillars */}
      <section className="border-b border-[#EFE4D8] bg-white">
        <Container className="grid gap-8 py-14" ><div className="grid gap-8 md:grid-cols-3">
          {pillars.map(([n, t, d]) => (
            <div key={n} className="flex items-start gap-4"><span className={`${mono} flex size-12 flex-none items-center justify-center rounded-full border-2 border-[#F97316] font-semibold text-[#C2410C]`}>{n}</span>
              <div><h2 className="mb-1 text-[22px] font-bold tracking-[-0.02em]">{t}</h2><p className="text-[#475569]">{d}</p></div></div>))}
        </div></Container>
      </section>

      {/* features */}
      <Container className="flex flex-col gap-10 py-24">
        <div className="flex max-w-[720px] flex-col gap-3">
          <span className={`${eyebrow} text-[#C2410C]`}>What SiteRadar watches</span>
          <h2 className={h2}>Everything a website can quietly get wrong, on one radar.</h2>
          <p className="text-lg text-[#475569]">Most outages are not dramatic. A certificate lapses, a domain is not renewed, an email record goes missing. SiteRadar checks all of it every day.</p>
        </div>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {features.map(({ Icon, title, text }) => (
            <div key={title} className={card}><span className={iconTile}><Icon size={22} aria-hidden="true" /></span><h3 className="text-lg font-bold">{title}</h3><p className="text-[15px] text-[#475569]">{text}</p></div>))}
        </div>
      </Container>

      {/* steps */}
      <section className="border-y border-[#EFE4D8] bg-white">
        <Container className="flex flex-col gap-10 py-24">
          <h2 className={h2}>On your radar in about ten minutes.</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map(([n, t, d]) => <div key={n} className="flex flex-col gap-3"><span className={`${mono} text-[44px] font-semibold leading-none text-[#F97316]`}>{n}</span><h3 className="text-xl font-bold">{t}</h3><p className="text-[#475569]">{d}</p></div>)}
          </div>
        </Container>
      </section>

      {/* alerts */}
      <section className="relative overflow-hidden bg-[#0F172A] text-white">
        <svg viewBox="0 0 600 600" aria-hidden="true" className="pointer-events-none absolute -bottom-[300px] -left-[260px] size-[640px]"><g fill="none" stroke="#F97316" strokeWidth="2"><circle cx="300" cy="300" r="120" strokeOpacity="0.18" /><circle cx="300" cy="300" r="210" strokeOpacity="0.12" /><circle cx="300" cy="300" r="290" strokeOpacity="0.07" /></g></svg>
        <Container className="relative flex flex-wrap items-center gap-14 py-24">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-[18px]">
            <span className={`${eyebrow} text-[#FDBA74]`}>Alerts</span>
            <h2 className={h2}>Alerts that reach you where you are.</h2>
            <p className="text-lg text-[#CBD5E1]">A text message when a site goes down, an email before a certificate or domain expires, and a message in Slack, Teams or Discord for the whole team. Alerts only fire after two failed checks, so you are not woken up by a blip.</p>
            <div className="flex flex-wrap gap-2">{["SMS", "Email", "Slack", "Microsoft Teams", "Discord"].map((c) => <span key={c} className="rounded-full bg-[#1E293B] px-3 py-1.5 text-[13px] font-semibold text-[#E2E8F0]">{c}</span>)}</div>
          </div>
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5">
            {[["SMS · SiteRadar · 14:02", <><b>DOWN:</b> shop.example.com has failed 2 checks in a row. We will text you when it is back.</>, "border-[#DC2626]", ""],
              ["SMS · SiteRadar · 14:21", <><b>UP:</b> shop.example.com is back after 19 minutes.</>, "border-[#16A34A]", "md:ml-10"],
              ["Email · 30 days before expiry", <>Your domain example.com expires on 31 Jan 2027. Renew it with your registrar before then.</>, "border-[#F97316]", ""]].map(([k, v, b, m], i) => (
              <div key={i} className={`rounded-[14px] border-l-[5px] bg-white px-[18px] py-4 text-[#0F172A] shadow-[0_10px_30px_rgba(0,0,0,0.3)] ${b} ${m}`}><div className="text-xs text-[#475569]">{k}</div><div className="text-[15px]">{v}</div></div>))}
          </div>
        </Container>
      </section>

      {/* report */}
      <Container className="flex flex-wrap items-center gap-14 py-24">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-[18px]">
          <span className={`${eyebrow} text-[#C2410C]`}>Monthly reports</span>
          <h2 className={h2}>A monthly report your clients will actually read.</h2>
          <p className="text-lg text-[#475569]">On the 1st of every month SiteRadar emails a clean PDF for each website: uptime, incidents, speed, visitors, domain and DNS health, and a short list of what to do next, in plain language.</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[#334155]"><li>Send it to your client, your team, or both</li><li>Your company logo on every report, and no watermark on paid plans</li><li>Track domains, hosting and tool subscriptions with their invoices</li></ul>
        </div>
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-[18px] rounded-[20px] border border-[#EFE4D8] bg-white p-7 shadow-[0_20px_50px_rgba(124,45,18,0.12)]">
          <div className="flex items-center justify-between border-b-[3px] border-[#F97316] pb-3.5">
            <div className="flex flex-col gap-0.5"><span className="text-xs font-bold tracking-[0.08em] text-[#475569]">MONTHLY REPORT · OCTOBER 2026</span><span className="text-[22px] font-bold tracking-[-0.02em]">shop.example.com</span></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/app-icon/siteradar-app-icon.svg" alt="" width={40} height={40} />
          </div>
          <div className="grid grid-cols-3 gap-2.5">{[["Uptime", "99.97%"], ["Visitors", "4,212"], ["Health", "81"]].map(([k, v]) => <div key={k} className="rounded-xl bg-[#FFF7ED] p-3"><div className="text-xs text-[#475569]">{k}</div><div className={`${mono} text-[22px] font-semibold`}>{v}</div></div>)}</div>
          <div className="flex flex-col gap-2.5"><span className="text-sm font-bold">What to do next</span>
            <div className="flex items-center gap-2.5 text-sm"><span className="rounded-full bg-[#FEE2E2] px-2.5 py-[3px] text-[11px] font-bold text-[#991B1B]">Fix</span>Add a DMARC record to protect your email</div>
            <div className="flex items-center gap-2.5 text-sm"><span className="rounded-full bg-[#FEF3C7] px-2.5 py-[3px] text-[11px] font-bold text-[#92400E]">Soon</span>Compress 9 large images</div></div>
        </div>
      </Container>

      {/* pricing teaser */}
      <section className="border-t border-[#EFE4D8] bg-white">
        <Container className="flex flex-col gap-8 py-24">
          <div className="flex flex-wrap items-end justify-between gap-4"><h2 className={h2}>Start free, upgrade when you grow.</h2><Link href="/pricing" className="text-base font-bold text-[#C2410C] hover:text-[#7C2D12]">Compare all plans →</Link></div>
          <HomePlans />
        </Container>
      </section>

      <CtaBand title="Stop finding out from your customers." text="Create a free account and add your first website in a couple of minutes." primary={{ href: "/signup", label: "Get started free" }} />
    </>
  );
}
