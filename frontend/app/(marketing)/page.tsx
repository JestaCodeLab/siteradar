import Link from "next/link";
import type { Metadata } from "next";
import { Activity, BarChart3, Clock, FileText, Mail, ListChecks, Receipt, ShieldCheck, Users } from "lucide-react";
import { Container, CtaBand, Rings } from "@/components/mkt";
import { btnOrange, btnOutlineDark, eyebrow, h2 } from "@/lib/mkt-styles";
import { HeroPreview } from "@/components/hero-preview";
import { HomePlans } from "@/components/home-plans";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL, organization, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Website monitoring",
  absoluteTitle: "Website Monitoring Software & Alerts | SiteRadar",
  description: "Monitor website uptime, speed, SSL certificates, domain expiry and DNS health. Get instant alerts, actionable insights and monthly reports with SiteRadar.",
  ogTitle: "SiteRadar — Website Monitoring & Digital Presence Intelligence",
  ogDescription: "Keep every website healthy. Monitor uptime, performance, SSL, domains and DNS while getting actionable insights and monthly reports.",
  path: "/",
  image: "/og/og-home.png",
});

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
const mono = "font-mono";

export default function Home() {
  return (
    <>
      <JsonLd data={[
        organization,
        { "@context": "https://schema.org", "@type": "WebSite", name: "SiteRadar", url: SITE_URL },
        {
          "@context": "https://schema.org", "@type": "SoftwareApplication", name: "SiteRadar", applicationCategory: "BusinessApplication", operatingSystem: "Web",
          url: SITE_URL, description: "Website monitoring for uptime, SSL, domain and DNS health, visitor stats and monthly reports."
        },
      ]} />
      {/* hero */}
      <section className="relative overflow-hidden bg-[#0F172A] text-white">
        <Rings className="-right-[260px] -top-[180px] hidden size-[900px] md:block" />
        <Container className="relative flex flex-wrap items-center gap-14 pb-9 pt-10 md:pb-24 md:pt-[88px]">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-[18px] md:gap-6">
            <span className={`${eyebrow} self-start rounded-full border border-[#FDBA74]/40 px-3 py-1.5 font-medium text-[#FDBA74]`}>Digital Presence Intelligence</span>
            <h1 className="text-[28px] font-bold leading-[1.12] tracking-[-0.025em] md:text-[clamp(38px,5vw,62px)] md:font-bold md:leading-[1.05] md:tracking-[-0.035em]">Know when your websites break, expire or slow down.</h1>
            <p className="max-w-[560px] text-base text-[#CBD5E1] md:text-[19px]"><span className="md:hidden">Uptime, SSL, domains, DNS, email health and visitors for every website you look after, plus a monthly report for your clients.</span><span className="hidden md:inline">Uptime, SSL and domain expiry, DNS and email health, speed and visitors for every website you look after. Plus a clear monthly report you can send straight to your clients.</span></p>
            <div className="mt-1 flex flex-col gap-2.5 md:flex-row md:flex-wrap md:gap-3"><Link href="/signup" className={btnOrange}>Get started</Link><Link href="/pricing" className={btnOutlineDark}>See pricing</Link></div>
            <div role="img" aria-label="Example: uptime 99.98%, response 6.1 seconds, SSL valid 74 days, audit score 81" className="mt-1.5 grid grid-cols-2 gap-2 md:hidden">
              {[["Uptime", "99.98%", ""], ["Response", "6.1 s", "text-[#FDBA74]"], ["SSL expires", "74 days", ""], ["Audit score", "81", ""]].map(([k, v, c]) => (
                <div key={k} className="rounded-xl bg-[#1E293B] p-3"><div className="text-xs text-[#94A3B8]">{k}</div><div className={`${mono} text-xl font-semibold ${c}`}>{v}</div></div>))}
            </div>
          </div>

          <HeroPreview />
        </Container>
      </section>

      {/* features */}
      <Container className="flex flex-col gap-5 py-12 md:gap-10 md:py-24">
        <div className="flex max-w-[720px] flex-col gap-3">
          <span className={`${eyebrow} text-[#C2410C]`}>What SiteRadar watches</span>
          <h2 className={h2}>Website Monitoring That Covers More Than Uptime.</h2>
          <p className="hidden text-lg text-[#475569] md:block">Most outages are not dramatic. A certificate lapses, a domain is not renewed, an email record goes missing. SiteRadar checks all of it every day.</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:gap-5 md:[grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {features.map(({ Icon, title, text }) => (
            <div key={title} className="flex flex-col gap-2 rounded-[14px] border border-[#EFE4D8] bg-white p-3.5 md:gap-2.5 md:rounded-2xl md:p-6"><span className="flex size-9 items-center justify-center rounded-[10px] bg-[#FFEDD5] text-[#C2410C] md:size-11 md:rounded-xl"><Icon size={18} aria-hidden="true" className="md:size-[22px]" /></span><h3 className="text-[15px] font-bold leading-tight md:text-lg">{title}</h3><p className="hidden text-[15px] text-[#475569] md:block">{text}</p></div>))}
        </div>
      </Container>

      {/* how it works */}
      <section className="border-y border-[#EFE4D8] bg-white">
        <Container className="flex flex-col gap-5 py-12 md:gap-10 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex max-w-[760px] flex-col gap-3">
              <span className={`${eyebrow} text-[#C2410C]`}>How it works</span>
              <h2 className={h2}>On your radar in 5 minutes.</h2>
              <p className="hidden text-lg text-[#475569] md:block">Three steps, no installation on your server, and nothing to maintain afterwards.</p>
            </div>
            <span className="hidden items-center gap-2.5 rounded-full border border-[#EFE4D8] bg-[#FFF7ED] px-5 py-3.5 md:inline-flex text-base font-bold text-[#9A3412]"><Clock size={20} aria-hidden="true" />About 5 minutes to set up</span>
          </div>

          <ol className="flex flex-col gap-5 md:hidden">
            {[["01", "Add your websites", "Paste each address. Checks start straight away.", false], ["02", "Install one line", "See visitors and real page speed.", false], ["03", "Relax, we will tell you", "Alerts when needed, a report every month.", true]].map(([n, t, d, dark]) => (
              <li key={String(n)} className="flex gap-3.5">
                <span className={`flex size-9 flex-none items-center justify-center rounded-full font-mono text-sm font-semibold ${dark ? "bg-[#0F172A] text-[#FDBA74]" : "bg-[#F97316] text-white"}`}>{n}</span>
                <div><div className="font-bold">{t}{n === "02" && <span className="ml-2 text-xs font-semibold text-[#475569]">(optional)</span>}</div><div className="text-[15px] text-[#475569]">{d}</div></div>
              </li>))}
          </ol>
          <ol className="hidden gap-6 md:grid lg:grid-cols-3">
            {[
              { n: "01", dark: false, title: "Add your websites", text: "Paste the address of each site. SiteRadar starts checking straight away and takes a picture of the homepage." },
              { n: "02", dark: false, title: "Install one line", optional: true, text: "Paste a tiny cookieless script on each site to see visitors and real page speed." },
              { n: "03", dark: true, title: "Relax, we will tell you", text: "Get alerts when something needs attention and a report at the start of every month." },
            ].map((st) => (
              <li key={st.n} className="relative flex flex-col gap-3 rounded-[22px] border border-[#EFE4D8] bg-[#FBF8F4] p-8">
                <div className="mb-3 flex items-center gap-4">
                  <span className="relative flex size-[92px] flex-none items-center justify-center -m-3.5" aria-hidden="true">
                    <span className="absolute inset-0 rounded-full bg-[#F97316]/[0.08]" /><span className="absolute inset-2.5 rounded-full bg-[#F97316]/[0.13]" />
                    <span className={`relative flex size-14 items-center justify-center rounded-full font-mono text-lg font-semibold ${st.dark ? "bg-[#0F172A] text-[#FDBA74]" : "bg-[#F97316] text-[#0F172A]"}`}>{st.n}</span>
                  </span>
                  <span className="mt-0.5 h-px flex-1 border-t border-dashed border-[#FDBA74]" aria-hidden="true" />
                </div>
                <h3 className="flex flex-wrap items-center gap-3 text-[26px] font-bold tracking-[-0.02em]">{st.title}{st.optional && <span className="rounded-full bg-[#E8EDF3] px-3 py-1 text-xs font-bold tracking-normal text-[#475569]">Optional</span>}</h3>
                <p className="text-[17px] leading-relaxed text-[#475569]">{st.text}</p>

                <div className="mt-auto pt-6">
                  {st.n === "01" && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-[#EFE4D8] bg-white p-4" role="img" aria-label="Adding a website: the address shop.example.com, then the first check shows Up">
                      <div className="flex gap-2.5"><span className="flex min-w-0 flex-1 items-center rounded-[10px] border border-[#CBD5E1] px-3.5 py-3 font-mono text-sm text-[#0F172A]">https://shop.example.com</span><span className="flex items-center rounded-[10px] bg-[#F97316] px-5 text-sm font-bold text-white">Add</span></div>
                      <div className="flex items-center justify-between text-sm text-[#475569]"><span>First check</span><span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-sm font-bold text-[#166534]">Up</span></div>
                    </div>
                  )}
                  {st.n === "02" && (
                    <div className="rounded-2xl bg-[#111827] p-5" role="img" aria-label="The one line of code to paste on a site">
                      <div className="mb-4 flex gap-1.5" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} className="size-2.5 rounded-full bg-[#4B5563]" />)}</div>
                      <code className="block break-all font-mono text-[15px] leading-relaxed"><span className="text-[#FDBA74]">&lt;script</span> <span className="text-[#E2E8F0]">defer src=</span><span className="text-[#86EFAC]">&quot;[your-snippet-url]&quot;</span><span className="text-[#FDBA74]">&gt;&lt;/script&gt;</span></code>
                    </div>
                  )}
                  {st.n === "03" && (
                    <div className="flex flex-col gap-2.5">
                      <div className="rounded-xl border border-l-[4px] border-[#EFE4D8] border-l-[#16A34A] bg-white px-4 py-3 text-sm"><div className="text-[#475569]">SMS (Ghana) · SiteRadar</div><div><b>UP:</b> shop.example.com is back after 19 minutes.</div></div>
                      <div className="rounded-xl border border-l-[4px] border-[#EFE4D8] border-l-[#F97316] bg-white px-4 py-3 text-sm"><div className="text-[#475569]">Email · 1 Nov</div><div>Your October report for shop.example.com is ready.</div></div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* alerts */}
      <section className="relative overflow-hidden bg-[#0F172A] text-white">
        <svg viewBox="0 0 600 600" aria-hidden="true" className="pointer-events-none absolute -bottom-[300px] -left-[260px] size-[640px]"><g fill="none" stroke="#F97316" strokeWidth="2"><circle cx="300" cy="300" r="120" strokeOpacity="0.18" /><circle cx="300" cy="300" r="210" strokeOpacity="0.12" /><circle cx="300" cy="300" r="290" strokeOpacity="0.07" /></g></svg>
        <Container className="relative flex flex-wrap items-center gap-8 py-12 md:gap-14 md:py-24">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 md:gap-[18px]">
            <span className={`${eyebrow} text-[#FDBA74]`}>Alerts</span>
            <h2 className={h2}>Alerts that reach you where you are.</h2>
            <p className="text-base text-[#CBD5E1] md:text-lg"><span className="md:hidden">Only after two failed checks, so you are not woken up by a blip.</span><span className="hidden md:inline">A text message in Ghana when a site goes down, an email before a certificate or domain expires, and a message in Slack or Teams for the whole team. Alerts only fire after two failed checks, so you are not woken up by a blip.</span></p>
            <div className="flex flex-wrap gap-2">{["SMS (Ghana only)", "Email", "Slack", "Microsoft Teams"].map((c) => <span key={c} className="rounded-full bg-[#1E293B] px-3 py-1.5 text-[13px] font-semibold text-[#E2E8F0]">{c}</span>)}</div>
          </div>
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5">
            {[["SMS (Ghana) · SiteRadar · 14:02", <><b>DOWN:</b> shop.example.com has failed 2 checks in a row. We will text you when it is back.</>, "border-[#DC2626]", ""],
            ["SMS (Ghana) · SiteRadar · 14:21", <><b>UP:</b> shop.example.com is back after 19 minutes.</>, "border-[#16A34A]", "md:ml-10"],
            ["Email · 30 days before expiry", <>Your domain example.com expires on 31 Jan 2027. Renew it with your registrar before then.</>, "border-[#F97316]", ""]].map(([k, v, b, m], i) => (
              <div key={i} className={`rounded-xl border-l-[5px] bg-white px-4 py-3.5 text-[#0F172A] shadow-[0_10px_30px_rgba(0,0,0,0.3)] md:rounded-[14px] md:px-[18px] md:py-4 ${i > 0 ? "hidden md:block" : ""} ${b} ${m}`}><div className="text-xs text-[#475569]">{k}</div><div className="text-[15px]">{v}</div></div>))}
          </div>
        </Container>
      </section>

      {/* report */}
      <Container className="flex flex-wrap items-center gap-14 py-12 md:py-24">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5 md:gap-[18px]">
          <span className={`${eyebrow} text-[#C2410C]`}>Monthly reports</span>
          <h2 className={h2}>A monthly report your clients will actually read.</h2>
          <p className="hidden text-lg text-[#475569] md:block">On the 1st of every month SiteRadar emails a clean PDF for each website: uptime, incidents, speed, visitors, domain and DNS health, and a short list of what to do next, in plain language.</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[#334155]"><li>Send it to your client, your team, or both</li><li>Your company logo on every report, and no watermark on paid plans</li><li>Track domains, hosting and tool subscriptions with their invoices</li></ul>
        </div>
        <div className="hidden min-w-0 flex-[1_1_440px] flex-col gap-[18px] rounded-[20px] border border-[#EFE4D8] bg-white p-7 md:flex shadow-[0_20px_50px_rgba(124,45,18,0.12)]">
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
        <Container className="flex flex-col gap-3.5 py-12 md:gap-8 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4"><h2 className={h2}>Plans that grow with you.</h2><Link href="/pricing" className="hidden text-base font-bold text-[#C2410C] hover:text-[#7C2D12] md:block">Compare all plans →</Link></div>
          <HomePlans />
          <Link href="/pricing" className="font-bold text-[#C2410C] md:hidden">Compare all plans →</Link>
        </Container>
      </section>

      <CtaBand title="Stop finding out from your customers." text="Create an account and add your first website in a couple of minutes." primary={{ href: "/signup", label: "Get started" }} />
    </>
  );
}
