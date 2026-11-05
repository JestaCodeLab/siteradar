import Link from "next/link";
import type { Metadata } from "next";
import { CtaBand, ctaPrimary, Section } from "@/components/mkt";

export const metadata: Metadata = { title: "Solutions" };

type Tone = "g" | "w" | "b";
const audiences: { reverse: boolean; tag: string; title: string; text: string; points: string[]; rows: [string, string, Tone, string][] }[] = [
  { reverse: false, tag: "Web agencies and freelancers", title: "Look after dozens of client sites without checking each one",
    text: "See every client website on one screen, get told before a client does, and send a professional report each month that shows the value of your care plan.",
    points: ["One workspace for all client sites, with team access and read-only viewers for clients", "Your logo on every monthly PDF report, with no watermark on paid plans", "Per-site alert recipients, so the right person hears first"],
    rows: [["Client A · shop.example.com", "Responding in 1.1 s · SSL 74 days", "g", "Up"], ["Client B · studio.example.org", "Domain expires in 21 days", "w", "Renew"], ["Client C · clinic.example.com", "DMARC record missing", "b", "Fix"]] },
  { reverse: true, tag: "Businesses and online shops", title: "Catch problems before they cost you a sale",
    text: "A slow page, an expired certificate or a broken checkout loses customers quietly. SiteRadar watches your site around the clock and tells you in plain words what to fix first.",
    points: ["Text message when the site goes down, and again when it is back", "Speed scores for phones and desktops, with the biggest improvements listed", "Visitor numbers and top pages without cookies or banners"],
    rows: [["Uptime this month", "99.97% with 1 short incident", "g", "Healthy"], ["Mobile speed", "Largest content takes 4.6 s to appear", "w", "Slow"], ["Sitemap", "553 pages listed, none broken", "g", "Good"]] },
  { reverse: false, tag: "Churches, schools and organisations", title: "A website that is always there for the people who rely on it",
    text: "Your site is often the first place people look. Keep it online, keep the domain and hosting paid on time, and keep the committee informed without technical jargon.",
    points: ["Track the domain, hosting and tools you pay for, with renewal reminders and invoices", "A short, readable report you can share with trustees or leadership", "Invite your volunteer or IT contact as a team member"],
    rows: [["Domain renewal", "church-example.org · 12 Dec 2026", "w", "In 38 days"], ["Hosting plan", "Paid · invoice on file", "g", "Active"], ["Email workspace", "Renews 15 Nov · invoice missing", "b", "Upload"]] },
];

const checks = [
  ["Uptime and response time", "Every few minutes, from outside your network."], ["SSL certificate expiry", "The exact date, with warnings weeks ahead."],
  ["Domain expiry", "Read from the registry, not from memory."], ["DNS changes", "Alerts when records change unexpectedly."],
  ["Email authentication", "SPF, DKIM and DMARC, with how to fix."], ["Broken links", "Found in the daily crawl of your pages."],
  ["SEO basics", "Titles, descriptions, headings, sitemap."], ["Security headers", "Missing protections and exposed files."],
  ["Speed for phone and desktop", "Google PageSpeed and Core Web Vitals."], ["Accessibility", "Image descriptions, labels and contrast."],
  ["Visitors and sources", "Cookieless, privacy friendly analytics."], ["Homepage preview", "A fresh picture every night."],
];
const tone = { g: "bg-ok-soft text-ok", w: "bg-warn-soft text-warn", b: "bg-bad-soft text-bad" };

export default function Solutions() {
  return (
    <>
      <Section tone="soft" className="!py-14 lg:!py-20">
        <div className="mx-auto flex max-w-[760px] flex-col items-center gap-5 text-center">
          <h1 className="text-[44px] font-bold leading-[1.04] tracking-[-0.035em] lg:text-[64px]">One platform, whoever looks after the website</h1>
          <p className="text-lg leading-relaxed text-ink-2">Whether you run sites for clients or for your own organisation, the same checks and the same monthly report keep everyone informed.</p>
        </div>
      </Section>

      {audiences.map((a, i) => (
        <Section key={a.tag} tone={i % 2 ? "soft" : "plain"}>
          <div className={`flex flex-wrap items-center gap-x-16 gap-y-10 ${a.reverse ? "flex-row-reverse" : ""}`}>
            <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
              <span className="w-fit rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand-ink">{a.tag}</span>
              <h2 className="text-[36px] font-bold leading-[1.1] tracking-[-0.03em] lg:text-[46px]">{a.title}</h2>
              <p className="text-[17px] leading-relaxed text-ink-2">{a.text}</p>
              <ul className="flex flex-col gap-3 text-[15px]">{a.points.map((p) => <li key={p} className="flex gap-3"><span className="mt-2 size-2 shrink-0 rounded-full bg-ok" />{p}</li>)}</ul>
              <Link href="/signup" className={`${ctaPrimary} w-fit`}>Get started free</Link>
            </div>
            <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-sm">
              {a.rows.map(([t, s, k, label]) => (
                <div key={t} className="flex items-center justify-between gap-3 rounded-xl bg-soft px-4 py-3.5">
                  <span className="min-w-0"><span className="block text-sm font-semibold">{t}</span><span className="block text-[13px] text-muted">{s}</span></span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tone[k]}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      ))}

      <Section>
        <h2 className="mb-10 text-center text-[36px] font-bold leading-[1.1] tracking-[-0.03em] lg:text-[46px]">What is checked on every website</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {checks.map(([t, s]) => (
            <div key={t} className="flex gap-3 rounded-xl border border-line p-5">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
              <span><span className="block text-[15px] font-semibold">{t}</span><span className="block text-sm text-ink-2">{s}</span></span>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand title="See it on your own websites" text="Add a site in a minute and your first report is already shaping up. The Free plan needs no card." secondary={{ href: "/contact", label: "Talk to us" }} />
    </>
  );
}
