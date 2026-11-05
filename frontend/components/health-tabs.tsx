"use client";

import { CalendarClock, FileText, Link2, Mail, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { LineChart } from "./charts";
import { btn, Card, CardTitle, Empty, ErrorState, Skeleton, Tile } from "./ui";
import {
  fetcher, send, type DnsCheck, type HealthResponse, type SiteDetail, type SubscriptionsResponse,
} from "@/lib/api";
import { fmtAgo, fmtDate, fmtDateTime } from "@/lib/format";

function useHealth(id: string) {
  const swr = useSWR<HealthResponse>(`/api/sites/${id}/health`, fetcher, { refreshInterval: (d) => (d?.running ? 4000 : 0) });
  const [starting, setStarting] = useState(false);
  async function recheck() {
    setStarting(true);
    try { await send("POST", `/api/sites/${id}/health`); await swr.mutate(); } finally { setStarting(false); }
  }
  return { ...swr, recheck, busy: starting || !!swr.data?.running };
}

function RecheckButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={busy} className={btn.secondary}>
      <RefreshCw size={16} aria-hidden="true" className={busy ? "animate-spin" : ""} />
      {busy ? "Checking…" : "Check again"}
    </button>
  );
}

const loading = <div className="flex flex-col gap-4"><Skeleton className="h-28" /><Skeleton className="h-52" /></div>;

// ---- Domain ----------------------------------------------------------------------
export function DomainTab({ site }: { site: SiteDetail }) {
  const { data, error, mutate, recheck, busy } = useHealth(site.id);
  const { data: subs } = useSWR<SubscriptionsResponse>(`/api/subscriptions?site=${site.id}`, fetcher);
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return loading;
  const d = data.domain;
  if (!d) return <Card><Empty title={busy ? "Checking the domain…" : "Not checked yet"}>The first check runs automatically within a minute of adding a website.</Empty></Card>;

  const left = d.days_left;
  const tone = left == null ? "muted" : left < 30 ? "bad" : left <= 60 ? "warn" : "ok";
  const mine = subs?.subscriptions.find((s) => s.category === "Domain" && s.status !== "cancelled");
  const gap = mine && d.expires ? Math.round((new Date(mine.next_renewal).getTime() - new Date(d.expires).getTime()) / 86400000) : 0;

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        <Tile label="Domain" icon={Link2} info="The registered domain name behind this website. It is worked out from the website address, ignoring www and sub-pages." value={<span className="break-all text-2xl">{d.domain}</span>} note={d.registrar ?? undefined} />
        <Tile label="Expires on" icon={CalendarClock} tone={tone} info="The expiry date published by the domain registry. If it passes without renewal, the website and every email address on the domain stop working." value={d.expires ? fmtDate(d.expires) : "—"} note={left == null ? undefined : left < 0 ? `Expired ${-left} days ago` : `${left} days left`} />
        <Tile label="Alerts" icon={ShieldCheck} info="The team is emailed once at each of these points before expiry, so a missed renewal email from the registrar does not catch you out." value="6 steps" note="At 60, 30, 14, 7, 3 and 1 days" />
      </section>

      {d.status !== "ok" && (
        <Card className="flex flex-col gap-2 p-5">
          <CardTitle>Expiry date not available</CardTitle>
          <p className="text-sm leading-relaxed text-muted">{d.error} Add the renewal date as a subscription instead and SiteWatch will remind you from there.</p>
          <div><Link href={`/subscriptions/new?site=${site.id}`} className={btn.primary}>Add domain subscription</Link></div>
        </Card>
      )}

      {mine && d.expires && Math.abs(gap) > 7 && (
        <p role="status" className="flex items-start gap-2.5 rounded-xl bg-warn-soft px-5 py-4 text-[15px] text-warn">
          <TriangleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>The subscription &ldquo;{mine.name}&rdquo; says it renews on {fmtDate(mine.next_renewal)}, but the registry says {fmtDate(d.expires)}. <Link href={`/subscriptions/${mine.id}`} className="font-semibold underline">Check the subscription</Link>.</span>
        </p>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-muted">Last checked {fmtAgo(d.ts)}. Checked every night, straight from the domain registry.</p>
        <RecheckButton busy={busy} onClick={recheck} />
      </Card>
    </div>
  );
}

// ---- DNS & email -------------------------------------------------------------------
const statusChip = {
  ok: ["Good", "bg-ok-soft text-ok"], warn: ["Check", "bg-warn-soft text-warn"], bad: ["Fix", "bg-bad-soft text-bad"], na: ["N/A", "bg-line-soft text-ink-2"],
} as const;

function Checks({ title, items }: { title: string; items: DnsCheck[] }) {
  return (
    <Card className="px-5 pb-2 pt-5">
      <CardTitle>{title}</CardTitle>
      {items.map((c) => (
        <div key={c.id} className="flex flex-wrap gap-3.5 border-t border-line-soft py-3.5">
          <span className={`h-fit min-w-16 rounded-full px-2.5 py-1 text-center text-xs font-semibold ${statusChip[c.status][1]}`}>{statusChip[c.status][0]}</span>
          <div className="flex min-w-[240px] flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{c.label}</span>
            <span className="break-words text-sm text-muted">{c.detail}</span>
            {c.fix && <span className="mt-1 text-sm leading-relaxed text-ink-2">How to fix: {c.fix}</span>}
          </div>
        </div>
      ))}
    </Card>
  );
}

export function DnsTab({ id }: { id: string }) {
  const { data, error, mutate, recheck, busy } = useHealth(id);
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return loading;
  const dns = data.dns;
  if (!dns) return <Card><Empty title={busy ? "Checking DNS…" : "Not checked yet"}>The first check runs automatically within a minute of adding a website.</Empty></Card>;

  const web = dns.checks.filter((c) => ["web", "ns", "www", "caa"].includes(c.id));
  const mail = dns.checks.filter((c) => ["mx", "spf", "dmarc", "dkim"].includes(c.id));
  const problems = dns.checks.filter((c) => c.status === "bad").length;
  const recs = Object.entries(dns.records).filter(([k]) => !["DKIM", "DMARC", "WWW"].includes(k));

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        <Tile label="DNS and email health" icon={Mail} tone={dns.score == null ? "muted" : dns.score >= 85 ? "ok" : dns.score >= 60 ? "warn" : "bad"}
          info="A score out of 100 for how well the domain's DNS is set up: web records, name servers, and email protection (SPF, DKIM, DMARC). Checks that do not apply, such as email checks on a domain without email, are left out."
          value={dns.score ?? "—"} note={problems ? `${problems} to fix` : "Nothing urgent"} />
        <Tile label="Recent changes" icon={FileText} tone={dns.history.length ? "warn" : "muted"}
          info="SiteWatch saves the DNS records every night and alerts the team when the web server, name servers, mail servers, SPF or DMARC change. An unexpected change can mean a hijack or a hosting mistake."
          value={dns.history.length} note={dns.history.length ? `Latest ${fmtAgo(dns.history[0].ts)}` : "No changes recorded"} />
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5"><Checks title="Website records" items={web} /></div>
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5"><Checks title="Email protection" items={mail} /></div>
      </div>

      <Card className="px-5 pb-2 pt-5">
        <CardTitle aside={`Checked ${fmtAgo(dns.ts)}`}>Records</CardTitle>
        {recs.map(([type, values]) => (
          <div key={type} className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line-soft py-3">
            <span className="w-16 shrink-0 font-mono text-sm font-medium">{type}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-1 font-mono text-[13px]">
              {values.length ? values.map((v) => <span key={v} className="break-all">{v}</span>) : <span className="text-muted">none</span>}
            </span>
          </div>
        ))}
      </Card>

      {dns.history.length > 0 && (
        <Card className="px-5 pb-2 pt-5">
          <CardTitle>Change history</CardTitle>
          {dns.history.map((h) => h.changes.map((c) => (
            <div key={h.ts + c.record} className="flex flex-col gap-1 border-t border-line-soft py-3.5">
              <span className="text-sm font-semibold">{c.record} changed <span className="font-normal text-muted">· {fmtDateTime(h.ts)}</span></span>
              <span className="break-all font-mono text-[13px] text-muted">{c.before.join(", ") || "none"} → {c.after.join(", ") || "none"}</span>
            </div>
          )))}
        </Card>
      )}

      <div className="flex justify-end"><RecheckButton busy={busy} onClick={recheck} /></div>
    </div>
  );
}

// ---- Sitemap -----------------------------------------------------------------------
export function SitemapTab({ id }: { id: string }) {
  const { data, error, mutate, recheck, busy } = useHealth(id);
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return loading;
  const s = data.sitemap;
  if (!s) return <Card><Empty title={busy ? "Reading the sitemap…" : "Not checked yet"}>The first check runs automatically within a minute of adding a website. Large sitemaps can take a minute.</Empty></Card>;

  if (!s.sitemap_url) {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <CardTitle>No sitemap found</CardTitle>
        <p className="text-sm leading-relaxed text-muted">{s.error} Most website builders and SEO plugins can generate a <code className="font-mono">sitemap.xml</code>. Add it to <code className="font-mono">robots.txt</code> so search engines find it.</p>
        <div><RecheckButton busy={busy} onClick={recheck} /></div>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Tile label="Pages listed" icon={FileText} info="How many page addresses the sitemap tells search engines about. A sudden drop can mean pages were removed or the sitemap broke." value={s.total.toLocaleString()} note={s.added == null ? "First check" : `+${s.added} / −${s.removed} since last check`} />
        <Tile label="Pages checked" icon={Link2} info="SiteWatch visits an evenly spread sample of up to 50 pages from the sitemap each night to confirm they load." value={s.checked} note={s.redirects ? `${s.redirects} redirect` + (s.redirects === 1 ? "" : "s") : "No redirects"} />
        <Tile label="Pages with errors" icon={TriangleAlert} tone={s.broken.length ? "bad" : "ok"} info="Sampled pages that returned an error or did not answer. Search engines treat these as dead ends, so remove or fix them." value={s.broken.length} note={s.broken.length ? "Need fixing" : "All loaded fine"} />
      </section>

      {s.error && <p role="status" className="rounded-xl bg-warn-soft px-5 py-4 text-sm text-warn">{s.error}</p>}

      {s.broken.length > 0 && (
        <Card className="px-5 pb-2 pt-5">
          <CardTitle>Pages that return errors</CardTitle>
          {s.broken.map((b) => (
            <div key={b.url} className="flex flex-wrap justify-between gap-3 border-t border-line-soft py-3">
              <a href={b.url} target="_blank" rel="noreferrer" className="min-w-0 break-all font-mono text-[13px] text-brand">{b.url}</a>
              <span className="rounded-full bg-bad-soft px-2.5 py-0.5 text-xs font-semibold text-bad">{String(b.status)}</span>
            </div>
          ))}
        </Card>
      )}

      {s.trend.length > 1 && (
        <Card className="p-5">
          <CardTitle>Pages in the sitemap over time</CardTitle>
          <LineChart unit="count" label="Number of pages in the sitemap over time" points={s.trend.map((t) => ({ x: new Date(t.ts * 1000).toISOString().slice(0, 10), y: t.total }))} />
        </Card>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="min-w-0 text-sm text-muted">
          <a href={s.sitemap_url} target="_blank" rel="noreferrer" className="break-all font-mono text-brand">{s.sitemap_url}</a>
          <span className="block">Last checked {fmtAgo(s.ts)}.</span>
        </p>
        <RecheckButton busy={busy} onClick={recheck} />
      </Card>
    </div>
  );
}
