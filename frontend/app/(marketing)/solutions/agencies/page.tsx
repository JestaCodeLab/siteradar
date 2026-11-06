import Link from "next/link";
import type { Metadata } from "next";
import { BellRing, CalendarClock, KeyRound, TrendingUp } from "lucide-react";
import { btnOrange, btnOutlineDark, card, Container, CtaBand, eyebrow, h2, iconTile, Rings } from "@/components/mkt";
import { HomePlans } from "@/components/home-plans";

export const metadata: Metadata = { title: "SiteRadar for agencies" };

const clients = [["Shop", "shop.example.com", "Up"], ["Jesta Digital Solutions", "jestadigitalsolutions.com", "Slow"], ["Church", "church.example.org", "Up"], ["Blog", "blog.example.com", "Up"]];
const who = [
  ["Digital marketing agencies", "Show results every month. Cookieless visitor analytics, an SEO and speed audit, and a client-ready PDF that explains what changed and what to do next."],
  ["Web development agencies", "Care plans that run themselves after launch. Uptime, SSL, domain and DNS change alerts, plus a daily audit of about 50 checks for every site you build."],
  ["Consultants", "Look after a handful of clients like a full team would. Reports carry your logo, and alerts reach you on SMS, email, Slack, Teams or Discord."],
];
const grid = [
  { Icon: CalendarClock, t: "Renewals on autopilot", d: "Every client’s domains, hosting and tools with renewal dates, reminders, invoice PDFs and a monthly spend report." },
  { Icon: BellRing, t: "Alerts before the client calls", d: "SMS, email, Slack, Teams or Discord, only after two failed checks, so your team is not chasing blips." },
  { Icon: TrendingUp, t: "Upsell with evidence", d: "The daily audit turns about 50 checks into a prioritised fix list, a ready-made scope for your next piece of work." },
  { Icon: KeyRound, t: "The right access for everyone", d: "Full admins, team members and read-only client viewers, each seeing exactly what they should." },
];

export default function Agencies() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#0F172A] text-white">
        <Rings className="-right-[260px] -top-[180px] size-[900px]" />
        <Container className="relative flex flex-wrap items-center gap-14 pb-24 pt-[88px]">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-6">
            <span className={`${eyebrow} text-[#FDBA74]`}>Solutions for agencies</span>
            <h1 className="text-[clamp(38px,5vw,60px)] font-bold leading-[1.05] tracking-[-0.035em]">Every client website, on one radar.</h1>
            <p className="max-w-[560px] text-[19px] text-[#CBD5E1]">For digital marketing agencies, web development agencies and consultants managing multiple clients. Catch problems before your clients call, and prove the value of your work every month.</p>
            <div className="flex flex-wrap gap-3"><Link href="/signup" className={btnOrange}>Get started free</Link><Link href="/contact" className={btnOutlineDark}>Talk to us</Link></div>
          </div>
          <div role="img" aria-label="A list of four client websites: three up and one slow" className="flex min-w-0 flex-[1_1_460px] flex-col gap-3 rounded-[20px] bg-white p-6 text-[#0F172A] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between"><span className="text-lg font-bold">Your clients</span><span className="text-[13px] text-[#475569]">3 up · 1 slow</span></div>
            <div className="flex flex-col">{clients.map(([n, h, s]) => (
              <div key={n} className="flex items-center justify-between gap-3 border-t border-[#EFE4D8] py-3"><span className="min-w-0"><span className="block font-semibold">{n}</span><span className="block truncate font-mono text-[13px] text-[#475569]">{h}</span></span>
                <span className={`rounded-full px-2.5 py-[3px] text-xs font-bold ${s === "Slow" ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#DCFCE7] text-[#166534]"}`}>● {s}</span></div>))}</div>
            <div className="flex items-center gap-3 rounded-xl bg-[#FFF7ED] p-3.5"><span className="font-mono text-lg font-semibold text-[#C2410C]">28 d</span><span className="text-sm text-[#334155]">SSL expires on shop.example.com · alert sent</span></div>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-10 py-24">
        <div className="flex max-w-[720px] flex-col gap-3"><span className={`${eyebrow} text-[#C2410C]`}>Built for the way agencies work</span><h2 className={h2}>However you serve your clients, SiteRadar keeps watch.</h2></div>
        <div className="grid gap-5 md:grid-cols-3">{who.map(([t, d]) => <div key={t} className={card}><h3 className="text-xl font-bold">{t}</h3><p className="text-[15px] text-[#475569]">{d}</p></div>)}</div>
      </Container>

      <section className="border-y border-[#EFE4D8] bg-white">
        <Container className="flex flex-wrap items-center gap-14 py-24">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-[18px] rounded-[20px] border border-[#EFE4D8] bg-white p-7 shadow-[0_20px_50px_rgba(124,45,18,0.12)]">
            <div className="flex items-center justify-between border-b-[3px] border-[#F97316] pb-3.5">
              <div className="flex flex-col gap-0.5"><span className="text-xs font-bold tracking-[0.08em] text-[#475569]">MONTHLY REPORT · OCTOBER 2026</span><span className="text-[22px] font-bold tracking-[-0.02em]">shop.example.com</span></div>
              <span className="rounded-lg border border-dashed border-[#94A3B8] px-3 py-2 text-[11px] font-bold tracking-[0.08em] text-[#475569]">YOUR LOGO</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">{[["Uptime", "99.97%"], ["Visitors", "4,212"], ["Health", "81"]].map(([k, v]) => <div key={k} className="rounded-xl bg-[#FFF7ED] p-3"><div className="text-xs text-[#475569]">{k}</div><div className="font-mono text-[22px] font-semibold">{v}</div></div>)}</div>
            <div className="flex flex-col gap-2.5"><span className="text-sm font-bold">What to do next</span>
              <div className="flex items-center gap-2.5 text-sm"><span className="rounded-full bg-[#FEE2E2] px-2.5 py-[3px] text-[11px] font-bold text-[#991B1B]">Fix</span>Add a DMARC record to protect your email</div>
              <div className="flex items-center gap-2.5 text-sm"><span className="rounded-full bg-[#FEF3C7] px-2.5 py-[3px] text-[11px] font-bold text-[#92400E]">Soon</span>Compress 9 large images</div></div>
          </div>
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-[18px]">
            <span className={`${eyebrow} text-[#C2410C]`}>Client reporting</span>
            <h2 className={h2}>A report with your name on it, sent on the 1st.</h2>
            <p className="text-lg text-[#475569]">Every client gets a clean PDF covering uptime, incidents, speed, visitors, domain and DNS health, with a short list of what to do next in plain language.</p>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[#334155]"><li>Your agency logo, and no watermark on paid plans</li><li>Sent to your client, your team, or both</li><li>Read-only access for clients who want to look for themselves</li></ul>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-10 py-24">
        <h2 className={`${h2} max-w-[720px]`}>Run client care without the spreadsheet.</h2>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {grid.map(({ Icon, t, d }) => <div key={t} className={card}><span className={iconTile}><Icon size={22} aria-hidden="true" /></span><h3 className="text-lg font-bold">{t}</h3><p className="text-[15px] text-[#475569]">{d}</p></div>)}
        </div>
      </Container>

      <section className="border-t border-[#EFE4D8] bg-white">
        <Container className="flex flex-col gap-8 py-24">
          <div className="flex flex-wrap items-end justify-between gap-4"><div className="flex flex-col gap-3"><span className={`${eyebrow} text-[#C2410C]`}>Plans for agencies</span><h2 className={`${h2} max-w-[680px]`}>Grow your client list without growing your workload.</h2></div>
            <Link href="/pricing" className="text-base font-bold text-[#C2410C] hover:text-[#7C2D12]">Compare all plans →</Link></div>
          <HomePlans ids={["growth", "scale"]} />
        </Container>
      </section>

      <CtaBand title="Put every client on the radar." text="Start free with one site, then move your whole client list across when you are ready." primary={{ href: "/signup", label: "Get started free" }} secondary={{ href: "/contact", label: "Talk to us" }} />
    </>
  );
}
