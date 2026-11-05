import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, FileText, ListChecks, Receipt } from "lucide-react";
import { btnOrange, btnOutlineDark, card, Container, CtaBand, eyebrow, h2, iconTile, Rings } from "@/components/mkt";
import { HomePlans } from "@/components/home-plans";

export const metadata: Metadata = { title: "SiteRadar for businesses" };

const who = [
  ["SMEs", "Peace of mind without an IT team. Plain-language alerts and fixes, and a Free plan to start with."],
  ["E-commerce brands", "When the shop is down, sales stop. Uptime and speed checks, SMS alerts, and checks every minute on Scale."],
  ["Enterprises", "Many sites and domains in one view, alerts in Slack or Teams, and team roles for every department."],
  ["Organisations", "NGOs, churches and schools: keep certificates, domains and email trusted, with no specialist needed."],
];
const manage = [
  { Icon: BarChart3, t: "Visitor analytics", d: "Visitors, sources, devices and real page-load times from a tiny cookieless script. No cookie banner needed." },
  { Icon: ListChecks, t: "Daily site audit", d: "About 50 checks across SEO, speed, security and accessibility, each with a plain-language fix." },
  { Icon: Receipt, t: "Subscriptions and invoices", d: "Domains, hosting and tools with renewal dates, reminders and invoice PDFs, plus a monthly spend report." },
  { Icon: FileText, t: "Monthly report", d: "A clear PDF on the 1st of each month for your team or management, with a prioritised list of what to do next." },
];
const coming = [["28 d", "SSL certificate expires", "Alert sent to the team"], ["87 d", "Domain renewal, example.com", "Expires 31 Jan 2027"], ["Today", "DNS record changed", "MX record updated · was this you?"]];

export default function Businesses() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#0F172A] text-white">
        <Rings className="-right-[260px] -top-[180px] size-[900px]" />
        <Container className="relative flex flex-wrap items-center gap-14 pb-24 pt-[88px]">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-6">
            <span className={`${eyebrow} text-[#FDBA74]`}>Solutions for businesses</span>
            <h1 className="text-[clamp(38px,5vw,60px)] font-extrabold leading-[1.05] tracking-[-0.035em]">Your digital presence, watched around the clock.</h1>
            <p className="max-w-[560px] text-[19px] text-[#CBD5E1]">For SMEs, enterprises, e-commerce brands and organisations managing their own digital presence. Know about problems before your customers do, and get a plain-language list of what to fix.</p>
            <div className="flex flex-wrap gap-3"><Link href="/signup" className={btnOrange}>Get started free</Link><Link href="/contact" className={btnOutlineDark}>Talk to us</Link></div>
          </div>
          <div role="img" aria-label="A website status card: site up, 4.2 thousand visitors, SSL valid for 74 days, domain renews in 87 days" className="flex min-w-0 flex-[1_1_460px] flex-col gap-3 rounded-[20px] bg-white p-6 text-[#0F172A] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between"><span className="text-lg font-bold">Your digital presence</span><span className="font-mono text-[13px] text-[#C2410C]">example.com</span></div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-[#EFE4D8] p-3"><div className="text-xs text-[#475569]">Website</div><div className="mt-1"><span className="rounded-full bg-[#DCFCE7] px-2.5 py-[3px] text-xs font-bold text-[#166534]">● Up</span></div></div>
              <div className="rounded-xl border border-[#EFE4D8] p-3"><div className="text-xs text-[#475569]">Visitors, 30 days</div><div className="font-mono text-[22px] font-semibold">4.2k</div></div>
              <div className="rounded-xl border border-[#EFE4D8] p-3"><div className="text-xs text-[#475569]">SSL certificate</div><div className="font-mono text-[22px] font-semibold">74 days</div></div>
              <div className="rounded-xl border border-[#EFE4D8] p-3"><div className="text-xs text-[#475569]">Domain renewal</div><div className="font-mono text-[22px] font-semibold">87 days</div></div>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl bg-[#FEF2F2] p-3.5 text-sm"><span className="rounded-full bg-[#FEE2E2] px-2.5 py-[3px] text-[11px] font-bold text-[#991B1B]">Fix</span><span>DMARC missing. Your email could land in spam. How to fix: included.</span></div>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-10 py-24">
        <div className="flex max-w-[720px] flex-col gap-3"><span className={`${eyebrow} text-[#C2410C]`}>Who it is for</span><h2 className={h2}>Whatever your size, your website is your front door.</h2></div>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>{who.map(([t, d]) => <div key={t} className={card}><h3 className="text-xl font-bold">{t}</h3><p className="text-[15px] text-[#475569]">{d}</p></div>)}</div>
      </Container>

      <section className="border-y border-[#EFE4D8] bg-white">
        <Container className="flex flex-wrap items-center gap-14 py-24">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-[18px]">
            <span className={`${eyebrow} text-[#C2410C]`}>Protect</span>
            <h2 className={h2}>Never lose your domain, certificate or email to a missed renewal.</h2>
            <p className="text-lg text-[#475569]">SiteRadar knows the exact expiry date of every certificate and domain and warns you weeks ahead. It checks SPF, DKIM and DMARC so your email reaches the inbox, and flags any DNS change as it happens.</p>
          </div>
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-1 rounded-[20px] border border-[#EFE4D8] bg-white p-6 shadow-[0_20px_50px_rgba(124,45,18,0.12)]">
            <span className="mb-2 text-sm font-bold">Coming up</span>
            {coming.map(([w, t, s]) => (
              <div key={t} className="flex items-center gap-4 border-t border-[#EFE4D8] py-3.5"><span className="w-16 flex-none font-mono text-xl font-semibold text-[#C2410C]">{w}</span><span><span className="block font-semibold">{t}</span><span className="block text-[13px] text-[#475569]">{s}</span></span></div>))}
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-10 py-24">
        <h2 className={`${h2} max-w-[760px]`}>Understand how your website performs, and what it costs to run.</h2>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {manage.map(({ Icon, t, d }) => <div key={t} className={card}><span className={iconTile}><Icon size={22} aria-hidden="true" /></span><h3 className="text-lg font-bold">{t}</h3><p className="text-[15px] text-[#475569]">{d}</p></div>)}
        </div>
      </Container>

      <section className="border-t border-[#EFE4D8] bg-white">
        <Container className="flex flex-col gap-8 py-24">
          <div className="flex flex-wrap items-end justify-between gap-4"><div className="flex flex-col gap-3"><span className={`${eyebrow} text-[#C2410C]`}>Plans for businesses</span><h2 className={`${h2} max-w-[680px]`}>Start free with one site. Scale up to 50.</h2></div>
            <Link href="/pricing" className="text-base font-bold text-[#C2410C] hover:text-[#7C2D12]">Compare all plans →</Link></div>
          <HomePlans ids={["free", "starter", "scale"]} short />
        </Container>
      </section>

      <CtaBand title="Stop finding out from your customers." text="Create a free account and add your first website in a couple of minutes." primary={{ href: "/signup", label: "Get started free" }} secondary={{ href: "/contact", label: "Talk to us" }} />
    </>
  );
}
