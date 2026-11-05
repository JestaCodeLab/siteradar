import Link from "next/link";
import type { Metadata } from "next";
import { Activity, BarChart3, FileText, Globe2, ListChecks, Receipt, ShieldCheck, Users } from "lucide-react";
import { CtaBand, ctaPrimary, ctaSecondary, Section } from "@/components/mkt";
import { HomePlans } from "@/components/home-plans";

export const metadata: Metadata = { title: "Website monitoring for agencies and businesses" };

const features = [
  { Icon: Activity, title: "Uptime and speed", text: "Every site is checked every few minutes for availability and response time, with a text or email only when it really matters." },
  { Icon: ShieldCheck, title: "SSL and domain expiry", text: "See the exact expiry date of every certificate and domain, and get warned weeks ahead instead of the day it lapses." },
  { Icon: Globe2, title: "DNS and email health", text: "We check SPF, DKIM and DMARC and alert you when DNS records change, so email lands in the inbox and hijacks are caught." },
  { Icon: ListChecks, title: "Daily site audit", text: "About 50 checks across SEO, speed, security and accessibility, each with a plain-language fix." },
  { Icon: BarChart3, title: "Visitor analytics", text: "A tiny cookieless script shows visitors, sources, devices and real page-load times. No cookie banner needed." },
  { Icon: Receipt, title: "Subscriptions and invoices", text: "Track domains, hosting and tools with renewal dates, reminders and the invoice PDFs, with a monthly spend report." },
  { Icon: FileText, title: "Monthly client reports", text: "A clear PDF for every website on the 1st of the month, with a prioritised list of what to do next." },
  { Icon: Users, title: "Your whole team", text: "Invite colleagues with the right access, from full admins to read-only viewers for clients." },
];

const steps = [
  { n: "1", title: "Add your websites", text: "Paste the address of each site. SiteWatch starts checking straight away and takes a picture of the homepage." },
  { n: "2", title: "Install one line", text: "Optional: paste a tiny script on each site to see visitors and real page speed." },
  { n: "3", title: "Relax, we will tell you", text: "Get alerts when something needs attention and a report at the start of every month." },
];

const demo = [
  { name: "Shop", host: "shop.example.com", warn: [6] }, { name: "Agency site", host: "agency.example.org", warn: [] },
  { name: "Church", host: "church.example.org", warn: [12, 13] }, { name: "Blog", host: "blog.example.com", warn: [] },
];

export default function Home() {
  return (
    <>
      <Section tone="soft" className="!py-14 lg:!py-20">
        <div className="flex flex-wrap items-center gap-x-16 gap-y-12">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-6">
            <span className="w-fit rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand-ink">Website monitoring for agencies and businesses</span>
            <h1 className="text-[40px] font-semibold leading-[1.1] lg:text-[54px]">Know when your websites break, expire or slow down.</h1>
            <p className="max-w-[560px] text-lg leading-relaxed text-ink-2">Uptime, SSL and domain expiry, DNS and email health, speed and visitors for every website you look after. Plus a clear monthly report you can send straight to your clients.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className={ctaPrimary}>Get started free</Link>
              <Link href="/pricing" className={ctaSecondary}>See pricing</Link>
            </div>
            <p className="text-sm text-muted">The Free plan is free for ever. No card needed.</p>
          </div>
          <div className="min-w-0 flex-[1_1_440px]">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-soft p-4"><p className="text-[13px] text-muted">Sites up</p><p className="text-[28px] font-semibold">8 <span className="text-sm font-normal text-muted">of 8</span></p></div>
                <div className="rounded-xl bg-soft p-4"><p className="text-[13px] text-muted">Avg response</p><p className="text-[28px] font-semibold">1.2 s</p></div>
              </div>
              <ul className="flex flex-col">
                {demo.map((s) => (
                  <li key={s.name} className="flex items-center gap-3 border-t border-line-soft py-3">
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{s.name}</span><span className="block truncate font-mono text-xs text-muted">{s.host}</span></span>
                    <span className="flex w-32 gap-px" aria-hidden="true">{Array.from({ length: 20 }, (_, i) => <span key={i} className={`h-5 flex-1 rounded-sm ${s.warn.includes(i) ? "bg-bar-warn" : "bg-bar-ok"}`} />)}</span>
                    <span className="rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok">Up</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <p className="rounded-lg bg-warn-soft px-3.5 py-2.5 text-warn">SSL expires in 28 days · alert sent to the team</p>
                <p className="rounded-lg bg-bad-soft px-3.5 py-2.5 text-bad">DMARC missing on one domain · how to fix: included</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <div className="mx-auto mb-12 flex max-w-[720px] flex-col gap-3 text-center">
          <h2 className="text-[34px] font-semibold leading-tight">Everything a website can quietly go wrong with, watched in one place</h2>
          <p className="text-[17px] leading-relaxed text-ink-2">Most outages are not dramatic. A certificate lapses, a domain is not renewed, an email record is missing. SiteWatch checks all of it every day.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ Icon, title, text }) => (
            <div key={title} className="flex flex-col gap-3 rounded-xl border border-line p-6">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon size={20} aria-hidden="true" /></span>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="text-[15px] leading-relaxed text-ink-2">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="soft">
        <h2 className="mb-10 text-center text-[34px] font-semibold">Set up in about ten minutes</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-7">
              <span className="flex size-10 items-center justify-center rounded-full bg-brand text-base font-semibold text-white">{s.n}</span>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="text-[15px] leading-relaxed text-ink-2">{s.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="flex flex-wrap items-center gap-x-16 gap-y-10">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
            <h2 className="text-[34px] font-semibold leading-tight">Alerts that reach you where you are</h2>
            <p className="text-[17px] leading-relaxed text-ink-2">A text message when a site goes down, an email before a certificate or domain expires, and a message in Slack, Teams or Discord for the whole team. Alerts only fire after two failed checks, so you are not woken up by a blip.</p>
            <div className="flex flex-wrap gap-2">{["SMS", "Email", "Slack", "Microsoft Teams", "Discord"].map((c) => <span key={c} className="rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand-ink">{c}</span>)}</div>
          </div>
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-3">
            <div className="rounded-xl border border-line bg-soft p-4 text-sm"><p className="mb-1 text-xs text-muted">SMS · SiteWatch · 14:02</p>DOWN: shop.example.com has failed 2 checks in a row. We will text you when it is back.</div>
            <div className="rounded-xl border border-line bg-soft p-4 text-sm"><p className="mb-1 text-xs text-muted">SMS · SiteWatch · 14:21</p>UP: shop.example.com is back after 19 minutes.</div>
            <div className="rounded-xl border border-line bg-soft p-4 text-sm"><p className="mb-1 text-xs text-muted">Email · 30 days before expiry</p>Your domain example.com expires on 31 Jan 2027. Renew it with your registrar before then.</div>
          </div>
        </div>
      </Section>

      <Section tone="soft">
        <div className="flex flex-wrap items-center gap-x-16 gap-y-10">
          <div className="min-w-0 flex-[1_1_380px]">
            <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-muted">Monthly report · October 2026</p>
              <h3 className="mb-4 mt-1 text-xl font-semibold">shop.example.com</h3>
              <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                {[["Uptime", "99.97%"], ["Visitors", "4,212"], ["Health", "81"]].map(([k, v]) => <div key={k} className="rounded-lg bg-soft p-3"><p className="text-xs text-muted">{k}</p><p className="text-xl font-semibold">{v}</p></div>)}
              </div>
              <p className="mb-2 text-sm font-semibold">What to do next</p>
              <p className="mb-1.5 flex gap-2 text-sm"><span className="rounded bg-bad-soft px-2 py-0.5 text-xs font-semibold text-bad">Fix</span>Add a DMARC record to protect your email</p>
              <p className="flex gap-2 text-sm"><span className="rounded bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">Soon</span>Compress 9 large images</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
            <h2 className="text-[34px] font-semibold leading-tight">A monthly report your clients will actually read</h2>
            <p className="text-[17px] leading-relaxed text-ink-2">On the 1st of every month SiteWatch emails a clean PDF for each website: uptime, incidents, speed, visitors, domain and DNS health, and a short list of what to do next, in plain language.</p>
            <ul className="flex flex-col gap-3 text-[15px]">
              {["Send it to your client, your team, or both", "Your company logo on every report, and no watermark on paid plans", "Track domains, hosting and tool subscriptions with their invoices"].map((t) => <li key={t} className="flex gap-3"><span className="mt-2 size-2 shrink-0 rounded-full bg-ok" />{t}</li>)}
            </ul>
          </div>
        </div>
      </Section>

      <Section>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-[34px] font-semibold leading-tight">Start free, upgrade when you grow</h2>
          <Link href="/pricing" className="text-[15px] font-semibold text-brand">Compare all plans</Link>
        </div>
        <HomePlans />
      </Section>

      <CtaBand title="Stop finding out from your customers" text="Create a free account and add your first website in a couple of minutes." />
    </>
  );
}
