import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbs } from "@/lib/seo";
import type { Metadata } from "next";
import { BarChart3, FileText, ScrollText, SearchCheck } from "lucide-react";
import { Container, CtaBand, Rings } from "@/components/mkt";
import { SolutionPlans } from "@/components/solution-plans";
import { btnOrange, btnOutlineDark, card, eyebrow, h2, h2Small, iconTile, monoLabel } from "@/lib/mkt-styles";

export const metadata: Metadata = pageMeta({
  title: "Website monitoring for businesses",
  description: "Know your website is up before your customers tell you it is not. Uptime, SSL and domain expiry alerts, visitor stats and a plain monthly report.",
  path: "/solutions/businesses",
  image: "/og/og-businesses.png",
});

const who = [
  ["SMEs", "#F97316", "Peace of mind without an IT team. Plain-language alerts and fixes, and a Free plan to start with."],
  ["E-commerce brands", "#FBA23C", "When the shop is down, sales stop. Uptime and speed checks, SMS alerts, and checks every minute on Scale."],
  ["Enterprises", "#7C2D12", "Many sites and domains in one view, alerts in Slack or Teams, and team roles for every department."],
  ["Organisations", "#0F172A", "NGOs, churches and schools: keep certificates, domains and email trusted, with no specialist needed."],
];
const manage = [
  { Icon: BarChart3, t: "Visitor analytics", d: "Visitors, sources, devices and real page-load times from a tiny cookieless script. No cookie banner needed." },
  { Icon: SearchCheck, t: "Daily site audit", d: "About 50 checks across SEO, speed, security and accessibility, each with a plain-language fix." },
  { Icon: ScrollText, t: "Subscriptions and invoices", d: "Domains, hosting and tools with renewal dates, reminders and invoice PDFs, plus a monthly spend report." },
  { Icon: FileText, t: "Monthly report", d: "A clear PDF on the 1st of each month for your team or management, with a prioritised list of what to do next." },
];

export default function Businesses() {
  return (
    <>
      <JsonLd data={breadcrumbs([["Home", "/"], ["For businesses", "/solutions/businesses"]])} />
      <section className="relative overflow-hidden bg-[#0F172A] text-white">
        <Rings className="-bottom-[420px] -right-[300px] size-[900px]" />
        <Container className="relative flex flex-wrap items-center gap-14 py-[88px]">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-5">
            <span className={`${eyebrow} self-start rounded-full border border-[#FDBA74]/40 px-3 py-1.5 text-[#FDBA74]`}>Solutions for businesses</span>
            <h1 className="text-[clamp(36px,4.6vw,58px)] font-bold leading-[1.05] tracking-[-0.035em]">Your digital presence, watched around the clock.</h1>
            <p className="text-[19px] text-[#CBD5E1]">For SMEs, enterprises, e-commerce brands and organisations managing their own digital presence. Know about problems before your customers do, and get a plain-language list of what to fix.</p>
            <div className="flex flex-wrap gap-3"><Link href="/signup" className={btnOrange}>Get started</Link><Link href="/contact" className={btnOutlineDark}>Talk to us</Link></div>
          </div>
          <div role="img" aria-label="Digital presence status: website up, SSL valid for 74 days, domain renews in 87 days, DMARC missing, 4.2 thousand visitors in 30 days"
            className="flex min-w-0 flex-[1_1_440px] flex-col gap-3 rounded-[20px] bg-white p-6 text-[#0F172A] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between"><span className="font-bold">Your digital presence</span><span className="font-mono text-[13px] text-[#C2410C]">example.com</span></div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-[#EFE4D8] p-3.5"><div className="text-[13px] text-[#475569]">Website</div><div className="flex items-center gap-2 text-lg font-bold"><span className="size-2.5 rounded-full bg-[#16A34A]" />Up</div></div>
              {[["Visitors, 30 days", "4.2k"], ["SSL certificate", "74 days"], ["Domain renewal", "87 days"]].map(([k, v]) => <div key={k} className="rounded-xl border border-[#EFE4D8] p-3.5"><div className="text-[13px] text-[#475569]">{k}</div><div className="font-mono text-lg font-semibold">{v}</div></div>)}
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-[#FEF2F2] px-3.5 py-3 text-sm"><span className="rounded-full bg-[#FEE2E2] px-2.5 py-[3px] text-[11px] font-bold text-[#991B1B]">Fix</span><span><b>DMARC missing.</b> Your email could land in spam. How to fix: included.</span></div>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-10 py-24">
        <div className="flex max-w-[720px] flex-col gap-3"><span className={`${eyebrow} text-[#C2410C]`}>Who it is for</span><h2 className={h2}>Whatever your size, your website is your front door.</h2></div>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
          {who.map(([t, c, d]) => <div key={t} style={{ borderTopColor: c }} className="flex flex-col gap-2.5 rounded-2xl border border-t-4 border-[#EFE4D8] bg-white p-[26px]"><h3 className="text-xl font-bold">{t}</h3><p className="text-[15px] text-[#475569]">{d}</p></div>)}
        </div>
      </Container>

      <section className="border-y border-[#EFE4D8] bg-white">
        <Container className="flex flex-wrap items-center gap-14 py-24">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
            <span className={monoLabel}>Protect</span>
            <h2 className={h2Small}>Never lose your domain, certificate or email to a missed renewal.</h2>
            <p className="text-lg text-[#475569]">SiteRadar knows the exact expiry date of every certificate and domain and warns you weeks ahead. It checks SPF, DKIM and DMARC so your email reaches the inbox, and flags any DNS change as it happens.</p>
          </div>
          <div role="img" aria-label="Upcoming: SSL certificate expires in 28 days, domain renewal in 87 days, DNS record changed today" className="flex min-w-0 flex-[1_1_440px] flex-col gap-3 rounded-[20px] border border-[#EFE4D8] bg-[#FBF8F4] p-6">
            <span className="text-sm font-bold">Coming up</span>
            {[["28 d", "SSL certificate expires", "Alert sent to the team", true], ["87 d", "Domain renewal, example.com", "Expires 31 Jan 2027", false]].map(([w, t, s, hot]) => (
              <div key={t as string} className="flex items-center gap-3.5 rounded-xl border border-[#EFE4D8] bg-white p-3.5"><span className={`w-16 font-mono text-[22px] font-semibold ${hot ? "text-[#C2410C]" : ""}`}>{w}</span><div><div className="font-semibold">{t}</div><div className="text-sm text-[#475569]">{s}</div></div></div>))}
            <div className="flex items-center gap-3.5 rounded-xl border border-[#EFE4D8] bg-white p-3.5"><span className="w-16 rounded-full bg-[#FEF3C7] py-[3px] text-center text-xs font-bold text-[#92400E]">Today</span><div><div className="font-semibold">DNS record changed</div><div className="text-sm text-[#475569]">MX record updated · was this you?</div></div></div>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-10 py-24">
        <h2 className={`${h2} max-w-[760px]`}>Understand how your website performs, and what it costs to run.</h2>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {manage.map(({ Icon, t, d }) => <div key={t} className={card}><span className={iconTile}><Icon size={22} aria-hidden="true" /></span><h3 className="text-lg font-bold">{t}</h3><p className="text-[15px] text-[#475569]">{d}</p></div>)}
        </div>
      </Container>

      <SolutionPlans variant="businesses" eyebrowText="Plans for businesses" title="Start free with one site. Scale up to 50." />
      <CtaBand title="Stop finding out from your customers." text="Create an account and add your first website in a couple of minutes." primary={{ href: "/signup", label: "Get started" }} secondary={{ href: "/contact", label: "Talk to us" }} onPage />
    </>
  );
}
