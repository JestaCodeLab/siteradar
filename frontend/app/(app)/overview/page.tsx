"use client";

import Link from "next/link";
import { CalendarClock, Globe, ShieldCheck, Timer, TriangleAlert } from "lucide-react";
import useSWR from "swr";
import { StripLegend, UptimeStrip } from "@/components/charts";
import { btn, Card, CardTitle, Empty, ErrorState, PageHeader, Skeleton, StatusChip, Tile } from "@/components/ui";
import { fetcher, type SitesResponse } from "@/lib/api";
import { fmtAgo, fmtDate, fmtDay, fmtMs, fmtNum, fmtPct } from "@/lib/format";

const cols = "grid grid-cols-[minmax(210px,2fr)_96px_minmax(250px,2.4fr)_92px_92px_104px_76px_96px] items-center gap-4";
const mono = "font-mono text-sm";

export default function OverviewPage() {
  const { data, error, mutate, isLoading } = useSWR<SitesResponse>("/api/sites", fetcher, { refreshInterval: 60000 });

  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  const s = data?.summary;

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={s ? `${s.total} sites monitored · last check ${fmtAgo(s.latest_check)} · checks run every ${s.check_interval_minutes} minutes` : "Loading…"}
        actions={<Link href="/websites/new" className={btn.primary}>Add website</Link>}
      />

      <section aria-label="Summary" className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        {s ? (
          <>
            <Tile label="Sites up" icon={Globe} info="How many of your websites answered the latest uptime check. A site counts as up when it responds successfully, even if it is slow." value={<>{s.up} <span className="text-lg font-medium text-muted">of {s.total}</span></>}
              note={s.down.length ? `${s.down.length} ${s.down.length === 1 ? "site is" : "sites are"} down` : "All sites are up"} tone={s.down.length ? "bad" : "ok"} />
            <Tile label="Open incidents" icon={TriangleAlert} info="Sites that are failing their checks. SiteWatch opens an incident after two failed checks in a row, emails the team, and emails again when the site recovers." value={s.down.length} note={s.down.length ? s.down.join(", ") : "None right now"} tone={s.down.length ? "bad" : "muted"} />
            <Tile label="Average response" icon={Timer} info={`The average time sites took to answer their latest check, leaving out sites that are down. Anything over ${s.slow_threshold_ms / 1000} seconds is flagged as slow.`} value={fmtMs(s.avg_response_ms)} note={s.slow.length ? `${s.slow.length} slower than ${s.slow_threshold_ms / 1000} s` : "All within limits"} tone={s.slow.length ? "warn" : "muted"} />
            <Tile label="Domains expiring within 60 days" icon={CalendarClock} tone={s.domains_expiring.length ? "warn" : "muted"} info="Domain names that expire within 60 days. If a domain lapses, the website and every email address on it stop working, so renew early." value={s.domains_expiring.length} note={s.domains_expiring.length ? s.domains_expiring.map((x) => `${x.name} (${x.expires ? fmtDay(x.expires) : x.days + " d"})`).join(" · ") : "Nothing to renew"} />
            <Tile label="SSL expiring within 30 days" icon={ShieldCheck} info="Websites whose SSL certificate runs out within 30 days. An expired certificate shows visitors a security warning, so renew it early." value={s.ssl_expiring.length} note={s.ssl_expiring.length ? s.ssl_expiring.map((x) => `${x.name} (${x.expires ? fmtDay(x.expires) : x.days + " d"})`).join(" · ") : "Nothing to renew"} />
          </>
        ) : (
          [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[128px]" />)
        )}
      </section>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1070px]">
            <div className={`${cols} border-b border-line bg-soft px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted`}>
              <span>Website</span><span>Status</span><span>Last 30 days</span><span>Uptime</span><span>Response</span><span>SSL expires</span><span>Audit</span><span>Visitors</span>
            </div>
            {isLoading && [0, 1, 2, 3].map((i) => <div key={i} className="border-b border-line-soft px-5 py-4"><Skeleton className="h-8" /></div>)}
            {data?.sites.map((r) => (
              <Link key={r.id} href={`/websites/${r.id}`} className={`${cols} min-h-11 border-b border-line-soft px-5 py-4 hover:bg-soft`}>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{r.name}</span>
                  <span className="truncate font-mono text-[13px] text-muted">{r.host}</span>
                </span>
                <span><StatusChip status={r.status} /></span>
                <UptimeStrip days={r.strip} />
                <span className={mono}>{fmtPct(r.uptime30)}</span>
                <span className={mono}>{r.status === "down" ? "—" : fmtMs(r.response_ms)}</span>
                <span className={mono} title={r.ssl_days == null ? undefined : `${r.ssl_days} days left`}>{r.ssl_expires ? fmtDate(r.ssl_expires) : "—"}</span>
                <span className={mono}>{r.audit_score ?? "—"}</span>
                <span className={mono}>{fmtNum(r.visitors30)}</span>
              </Link>
            ))}
            {data && data.sites.length === 0 && <Empty title="No websites yet">Add your first website to start monitoring it.</Empty>}
          </div>
        </div>
        <div className="px-5 py-3.5"><StripLegend /></div>
      </Card>

      {data && (data.summary.down.length > 0 || data.summary.ssl_expiring.length > 0 || data.summary.slow.length > 0) && (
        <Card className="px-5 pb-2 pt-5">
          <CardTitle>Needs attention</CardTitle>
          {data.sites.filter((x) => x.status === "down" || x.status === "warn").map((x) => (
            <Attention key={x.id} tone="bad" label="Critical" id={x.id} title={x.status === "down" ? `${x.name} is down` : `${x.name} failed its last check`} detail={x.error ?? "The site did not answer the last checks."} />
          ))}
          {data.summary.ssl_expiring.map((x) => (
            <Attention key={x.name} tone="warn" label="Warning" id={data.sites.find((s) => s.name === x.name)!.id} title={`${x.name}: SSL certificate expires ${x.expires ? "on " + fmtDate(x.expires) : "in " + x.days + " days"}`} detail={`${x.days} days left. Renew it before visitors see a security warning.`} />
          ))}
          {data.sites.filter((x) => x.status === "slow").map((x) => (
            <Attention key={x.id} tone="warn" label="Warning" id={x.id} title={`${x.name} is responding slowly`} detail={`The latest check took ${fmtMs(x.response_ms)}. Slow threshold is ${data.summary.slow_threshold_ms / 1000} s.`} />
          ))}
        </Card>
      )}
    </>
  );
}

function Attention({ tone, label, id, title, detail }: { tone: "bad" | "warn"; label: string; id: string; title: string; detail: string }) {
  const cls = tone === "bad" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn";
  return (
    <div className="flex flex-wrap items-center gap-3.5 border-t border-line-soft py-3.5">
      <span className={`min-w-[74px] rounded-full px-2.5 py-1 text-center text-xs font-semibold ${cls}`}>{label}</span>
      <span className="flex min-w-[260px] flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-sm text-muted">{detail}</span>
      </span>
      <Link href={`/websites/${id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">View site</Link>
    </div>
  );
}
