"use client";

import { useToast } from "@/components/toast";
import { AlertTriangle, Receipt, CalendarClock, ClipboardCheck, Eye, MousePointerClick, ShieldCheck, Timer, Users, Zap, Activity, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR, { mutate } from "swr";
import { HBar, StripLegend, UptimeStrip } from "./charts";
import { TrackingInstall } from "./tracking-install";
import { WordPressPlugin } from "./wordpress-plugin";
import { siteIsSetUp, useSetup } from "./setup-dialog";
import { PageSpeedCard } from "./vitals";
import { ResponseChart } from "./response-chart";
import { PreviewCard } from "./preview-card";
import { btn, Card, CardTitle, Empty, ErrorState, Field, input, SeverityChip, Skeleton, SubStatusChip, Tile } from "./ui";
import {
  fetcher, send, type AnalyticsResponse, type AuditResponse, type FixesResponse, type ReportMonths, type SiteDetail, type SubscriptionsResponse,
} from "@/lib/api";
import { useMe } from "@/lib/me";
import { daysUntil, fmtDate, fmtDateTime, fmtMs, fmtNum, fmtPct, money, splitEmails } from "@/lib/format";

const delta = (now: number | null | undefined, before: number | null | undefined) =>
  now == null || !before ? null : Math.round((100 * (now - before)) / before);

function Delta({ v, invert = false }: { v: number | null; invert?: boolean }) {
  if (v == null) return <span className="text-muted">no previous data</span>;
  const good = invert ? v < 0 : v > 0;
  return <span className={v === 0 ? "text-muted" : good ? "text-ok" : "text-bad"}>{v > 0 ? "▲" : v < 0 ? "▼" : "•"} {Math.abs(v)}% vs previous period</span>;
}

function Loading() {
  return <div className="flex flex-col gap-4"><Skeleton className="h-28" /><Skeleton className="h-52" /></div>;
}

// ---- Overview ---------------------------------------------------------------
export function OverviewTab({ site, onChange }: { site: SiteDetail; onChange: () => void }) {
  const verified = siteIsSetUp(site);
  const { open: openSetup, isWp } = useSetup();
  const threshold = 3000;
  const sslTone = site.ssl_days != null && site.ssl_days <= 21 ? "warn" : "muted";
  const waitChecks = !!site.first_run?.checks;
  const waitAudit = !!site.first_run?.audit || site.audit_running;
  const wait = <Skeleton className="h-8 w-24" />;
  return (
    <div className="flex flex-col gap-5">
      {!verified && (
        <p role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-warn-soft px-5 py-4 text-[15px] text-warn">
          <AlertTriangle size={18} aria-hidden="true" />
          <span><strong>Setup incomplete.</strong> {isWp ? "Connect the SiteRadar plugin" : "Install the tracking snippet"} to finish setting up {site.name}. Until then there is no visitor data and the monthly report is on hold.</span>
          <button type="button" onClick={openSetup} className="min-h-10 rounded-lg bg-warn px-4 text-sm font-semibold text-white hover:opacity-90">{isWp ? "Connect the plugin" : "Get the snippet"}</button>
        </p>
      )}
      {site.status === "down" && (
        <p role="alert" className="rounded-xl bg-bad-soft px-5 py-4 text-[15px] text-bad">
          <strong>{site.name} is down</strong>{site.down_since ? ` since ${fmtDateTime(site.down_since)}` : ""}. {site.error}
        </p>
      )}
      <section className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
        <Tile label="Uptime, 30 days" icon={Activity} info="The share of the last 30 days the site was reachable. It is worked out from how long incidents lasted, so one failed check that recovers straight away does not count." value={waitChecks ? wait : fmtPct(site.uptime_stats.uptime)} note={`${site.uptime_stats.incident_count} incident${site.uptime_stats.incident_count === 1 ? "" : "s"}`} />
        <Tile label="Response time" icon={Timer} info="How long the site took to answer its latest check. The 30-day average is shown underneath. Over 3 seconds counts as slow." value={waitChecks ? wait : fmtMs(site.response_ms)} note={`Average ${fmtMs(site.uptime_stats.avg_ms)}`} tone={site.status === "slow" ? "warn" : "muted"} />
        <Tile label="SSL certificate" icon={ShieldCheck} info="Days left until the website's security certificate runs out, with the date underneath. The team is emailed 21 days before, then daily, until it is renewed. After that date visitors see a security warning." value={waitChecks && site.ssl_days == null ? wait : site.ssl_days == null ? "—" : `${site.ssl_days} days`} note={site.ssl_expires ? `Expires ${fmtDate(site.ssl_expires)}` : "Not checked yet"} tone={sslTone} />
        <Tile label="Domain expires" icon={CalendarClock} tone={site.domain_days != null && site.domain_days <= 60 ? "warn" : "muted"} info="Days until the domain name registration runs out, with the date underneath, taken from the domain registry. If it lapses, the website and email stop working. Details are in the Domain tab." value={waitChecks && site.domain_days == null ? wait : site.domain_days == null ? "—" : `${site.domain_days} days`} note={site.domain_expires ? `Expires ${fmtDate(site.domain_expires)}` : "Not checked yet"} />
        <Tile label="Audit score" icon={ClipboardCheck} info="The overall result of the nightly audit of up to 50 pages, covering SEO, performance, security, accessibility and best practices. 85 or more is healthy. Under 60 needs work." value={waitAudit && site.audit_score == null ? wait : site.audit_score ?? "—"} note={site.top_issues.length ? `${site.top_issues.length} high issues` : "No high issues"} />
        <Tile label="Visitors, 30 days" icon={Users} info="Unique visitors in the last 30 days, counted by the tracking snippet. It needs the snippet installed, and counting starts on the day you install it." value={fmtNum(site.visitors30)} note={`${fmtNum(site.pageviews30)} page views`} />
      </section>

      <PreviewCard site={site} onChange={onChange} />

      <PageSpeedCard ps={site.pagespeed} auditRan={site.audit_ts != null} loading={waitAudit && !site.pagespeed} />

      <Card className="flex flex-col gap-3.5 p-5">
        <CardTitle aside={waitChecks ? undefined : `${fmtPct(site.uptime_stats.uptime)} · ${site.uptime_stats.downtime_minutes} min downtime`}>Uptime, last 30 days</CardTitle>
        {waitChecks ? <Skeleton className="h-11" /> : <UptimeStrip days={site.strip} height="h-11" />}
        <div className="flex justify-between text-xs text-muted"><span>30 days ago</span><span>Today</span></div>
        <StripLegend />
      </Card>

      <Card className="p-5">
        <CardTitle aside="Last 30 days">Response time</CardTitle>
        {waitChecks ? <Skeleton className="h-64" /> : <ResponseChart label="Daily average response time for the last 30 days" points={site.response_series.map((r) => ({ x: r.day, y: r.ms }))} threshold={threshold} />}
      </Card>

      <div className="flex flex-wrap gap-5">
        <Card className="min-w-0 flex-[1_1_360px] px-5 pb-2 pt-5">
          <CardTitle>Recent incidents</CardTitle>
          {site.incidents.length === 0 && <p className="border-t border-line-soft py-4 text-sm text-muted">No incidents in the last 90 days.</p>}
          {site.incidents.map((i) => (
            <div key={i.started} className="flex flex-col gap-0.5 border-t border-line-soft py-3.5">
              <span className="text-[15px] font-semibold">{i.cause ?? "Down"}</span>
              <span className="text-sm text-muted">{fmtDateTime(i.started)} {i.ended ? `to ${fmtDateTime(i.ended)} · resolved` : "· still ongoing"}</span>
            </div>
          ))}
        </Card>
        <Card className="min-w-0 flex-[1_1_360px] px-5 pb-2 pt-5">
          <CardTitle>Top issues from the last audit</CardTitle>
          {waitAudit && site.audit_score == null && <div role="status" aria-label="Running the first audit" className="flex flex-col gap-3 border-t border-line-soft py-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-5 w-1/2" /></div>}
          {!(waitAudit && site.audit_score == null) && site.top_issues.length === 0 && <p className="border-t border-line-soft py-4 text-sm text-muted">{site.audit_score == null ? "No audit has run yet. It runs every night, or press Run audit." : "No high-severity issues."}</p>}
          {site.top_issues.map((i) => (
            <div key={i.rule} className="flex items-center gap-3 border-t border-line-soft py-3.5">
              <SeverityChip severity="high" /><span className="text-[15px]">{i.title}</span>
            </div>
          ))}
        </Card>
      </div>

      <WordPressPlugin site={site} />
      {!isWp && <TrackingInstall site={site} onChange={onChange} />}
    </div>
  );
}

// ---- Analytics --------------------------------------------------------------
export function AnalyticsTab({ id }: { id: string }) {
  const { open: openSetup, isWp, ready } = useSetup();
  const [days, setDays] = useState(30);
  const { data, error, mutate: retry } = useSWR<AnalyticsResponse>(`/api/sites/${id}/analytics?days=${days}`, fetcher);
  if (error) return <ErrorState message={error.message} retry={() => retry()} />;
  if (!data) return <Loading />;
  const a = data.current;
  const empty = !a.pageviews;
  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label="Period" className="inline-flex gap-1 self-start rounded-[10px] bg-[#e8ebf0] p-1">
        {[7, 30, 90].map((d) => (
          <button key={d} aria-pressed={days === d} onClick={() => setDays(d)} className={`min-h-10 rounded-[7px] px-5 text-sm ${days === d ? "bg-surface font-semibold shadow-sm" : "font-medium text-ink-2"}`}>{d} days</button>
        ))}
      </div>
      {empty && (
        <Card><Empty icon={Users} title="No visits recorded yet"
          action={!ready ? <button type="button" onClick={openSetup} className={btn.primary}>{isWp ? "Connect the plugin" : "Get the tracking snippet"}</button> : undefined}>
          {ready ? "Visits appear within a minute of the first page view." : isWp ? "Connect the SiteRadar plugin and it starts counting visits by itself." : "Install the tracking snippet on your website. Visits appear within a minute."}
        </Empty></Card>
      )}
      {!empty && (
        <>
          <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <Tile label="Visitors" icon={Users} info="Unique people who visited in this period. Nobody is tracked across days, and no personal data is stored." value={a.visitors.toLocaleString()} note={<Delta v={delta(a.visitors, data.previous.visitors)} />} />
            <Tile label="Page views" icon={Eye} info="Every page that was loaded, including repeat views by the same visitor." value={a.pageviews.toLocaleString()} note={<Delta v={delta(a.pageviews, data.previous.pageviews)} />} />
            <Tile label="Bounce rate" icon={MousePointerClick} info="The share of visits that looked at only one page and then left. Lower usually means visitors found what they wanted." value={`${a.bounce_rate ?? 0}%`} note={`${a.pages_per_visit ?? 0} pages per visit`} />
            <Tile label="Real page load" icon={Zap} info="The median time pages took to finish loading in real visitors' browsers. Half of the visits were faster than this." value={fmtMs(a.median_load_ms)} note="Median for visitors" />
          </section>
          <div className="flex flex-wrap items-start gap-5">
            <Card className="min-w-0 flex-[1.4_1_420px] px-5 pb-2 pt-5">
              <CardTitle>Top pages</CardTitle>
              {a.top_pages?.map(([path, n]) => (
                <div key={path} className="flex justify-between gap-3 border-t border-line-soft py-3.5">
                  <span className="min-w-0 truncate font-mono text-sm">{path}</span><span className="font-mono text-sm">{n.toLocaleString()}</span>
                </div>
              ))}
            </Card>
            <Card className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 p-5">
              <CardTitle>Where visitors come from</CardTitle>
              {a.referrers?.map(([name, , pct]) => <HBar key={name} label={name} value={`${pct}%`} pct={pct} />)}
              <p className="text-[13px] leading-relaxed text-muted">Cookieless tracking. No personal data is stored.</p>
            </Card>
          </div>
          <div className="flex flex-wrap items-start gap-5">
            <Card className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 p-5">
              <CardTitle>Devices</CardTitle>
              {a.devices?.map(([name, , pct]) => <HBar key={name} label={name} value={`${pct}%`} pct={pct} color="bg-ok" />)}
            </Card>
            <Card className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 p-5">
              <CardTitle>Browsers</CardTitle>
              {a.browsers?.map(([name, , pct]) => <HBar key={name} label={name} value={`${pct}%`} pct={pct} color="bg-ok" />)}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ---- Audit ------------------------------------------------------------------
/** The fix button under a finding: apply, see that it is queued or applied, and undo. */
function FixAction({ siteId, rule, fx, onChange, openSetup }: { siteId: string; rule: string; fx: FixesResponse; onChange: () => void; openSetup: () => void }) {
  const { isAdmin } = useMe();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const item = fx.items[rule];
  if (!item) return null;

  async function change(on: boolean) {
    if (on && item.confirm && !confirm(`${item.what}\n\nApply this fix?`)) return;
    setBusy(true);
    try {
      await send("POST", `/api/sites/${siteId}/fixes/${rule}`, { on });
      toast.success(on ? "Fix switched on." : "Fix removed.", on ? "The plugin applies it within a few seconds." : "The plugin takes it off your website.");
      onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not change the fix."); }
    setBusy(false);
  }

  if (item.state === "applied") {
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-full bg-ok-soft px-2.5 py-1 text-[13px] font-semibold text-ok">Fix applied</span>
        <span className="text-[13px] text-muted">It disappears from this list after the next audit.</span>
        {isAdmin && <button type="button" onClick={() => change(false)} disabled={busy} className="min-h-9 text-[13px] font-semibold text-brand hover:underline disabled:opacity-60">Undo</button>}
      </div>
    );
  }
  if (item.state === "queued") {
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-full bg-warn-soft px-2.5 py-1 text-[13px] font-semibold text-warn">Applying…</span>
        <span className="text-[13px] text-muted">Waiting for the plugin on your website to confirm.</span>
        {isAdmin && <button type="button" onClick={() => change(false)} disabled={busy} className="min-h-9 text-[13px] font-semibold text-brand hover:underline disabled:opacity-60">Cancel</button>}
      </div>
    );
  }
  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      <span className="text-[13px] leading-relaxed text-muted">{item.what}</span>
      <div className="flex flex-wrap items-center gap-2.5">
        {!fx.allowed ? <Link href="/settings?tab=billing" className="text-[13px] font-semibold text-brand hover:underline">Upgrade to fix this with one click</Link>
          : !fx.connected ? <button type="button" onClick={openSetup} className={btn.secondary}>Connect the plugin to fix this</button>
          : !isAdmin ? <span className="text-[13px] text-muted">Ask an account admin to apply this fix.</span>
          : <button type="button" onClick={() => change(true)} disabled={busy} className={btn.primary}><Wrench size={15} aria-hidden="true" />{busy ? "Applying…" : item.label}</button>}
      </div>
    </div>
  );
}

export function AuditTab({ id, site, onRun, busy }: { id: string; site: SiteDetail; onRun: () => void; busy: boolean }) {
  const { open: openSetup, isWp } = useSetup();
  const { data: fx, mutate: refetchFx } = useSWR<FixesResponse>(isWp ? `/api/sites/${id}/fixes` : null, fetcher,
    { refreshInterval: (d) => (d && Object.values(d.items).some((i) => i.state === "queued") ? 4000 : 0) });
  const { data, error, mutate: retry } = useSWR<AuditResponse>(`/api/sites/${id}/audit`, fetcher, { refreshInterval: (d) => (d?.running ? 5000 : 0) });
  if (error) return <ErrorState message={error.message} retry={() => retry()} />;
  if (!data) return <Loading />;
  if (!data.audit) {
    return <Card><Empty icon={ClipboardCheck} title={data.running ? "Audit is running…" : "No audit yet"}>{data.running ? "Results appear in about a minute." : "Audits run every night at 03:00. Press Run audit above to run one now."}</Empty></Card>;
  }
  const { scores, issues } = data.audit;
  const color = (v: number) => (v >= 85 ? "bg-bar-ok" : v >= 60 ? "bg-bar-warn" : "bg-bar-bad");
  return (
    <div className="flex flex-col gap-5">
      {fx && (() => {
        const fresh = Object.values(fx.items).filter((i) => i.state === "applied" && i.since != null && i.since > data.audit!.ts).length;
        if (!fresh) return null;
        const left = site.audit_runs_left;
        return (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand-soft px-5 py-4">
            <div className="flex min-w-[240px] flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-semibold">{fresh} {fresh === 1 ? "fix was" : "fixes were"} applied after this audit</span>
              <span className="text-sm leading-relaxed text-ink-2">The findings below are from {fmtDateTime(data.audit.ts)}, so they still list what you fixed. Run a new audit to confirm they are gone. It also runs by itself tonight.</span>
            </div>
            <button type="button" onClick={onRun} disabled={busy || site.audit_running || left === 0} className={btn.primary}>
              {site.audit_running ? "Audit running…" : left === 0 ? "No audits left today" : `Run audit now${left !== undefined ? ` (${left} left today)` : ""}`}
            </button>
          </div>
        );
      })()}
      <PageSpeedCard ps={data.audit.pagespeed} auditRan />
      <section className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
        {["Overall", ...data.categories].map((k) => (
          <div key={k} className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-[18px]">
            <span className="text-[13px] text-muted">{k}</span>
            <span className="text-[28px] font-semibold leading-none">{scores[k] ?? "—"}<span className="text-sm font-medium text-muted"> / 100</span></span>
            <div className="h-1.5 rounded bg-[#e8ebf0]"><div className={`h-1.5 rounded ${color(scores[k] ?? 0)}`} style={{ width: `${scores[k] ?? 0}%` }} /></div>
          </div>
        ))}
      </section>
      <Card className="px-5 pb-2 pt-5">
        <CardTitle aside={
          <span className="flex flex-wrap items-center gap-3">
            <span>{`Audited ${fmtDateTime(data.audit.ts)} · ${data.audit.pages} pages crawled`}</span>
            {isWp && issues.length > 0 && fx && !fx.connected && <button type="button" onClick={openSetup} className={btn.primary}><Wrench size={16} aria-hidden="true" />Connect the plugin to fix issues</button>}
          </span>
        }>Findings</CardTitle>
        {issues.length === 0 && <p className="border-t border-line-soft py-4 text-sm text-ok">No issues found. Nice work.</p>}
        {issues.map((i) => (
          <div key={i.rule} className="flex flex-wrap gap-3.5 border-t border-line-soft py-4">
            <div className="w-[74px] shrink-0"><SeverityChip severity={i.severity} /></div>
            <div className="flex min-w-[260px] flex-1 flex-col gap-1">
              <span className="text-[15px] font-semibold">{i.title} <span className="font-normal text-muted">· {i.count} {i.count === 1 ? "page" : "pages"}</span></span>
              <span className="text-sm leading-relaxed text-ink-2">How to fix: {i.fix}</span>
              {fx && <FixAction siteId={id} rule={i.rule} fx={fx} onChange={() => refetchFx()} openSetup={openSetup} />}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ---- Reports ----------------------------------------------------------------
export function ReportsTab({ id }: { id: string }) {
  const { data, error, mutate: retry } = useSWR<ReportMonths>(`/api/sites/${id}/reports`, fetcher);
  if (error) return <ErrorState message={error.message} retry={() => retry()} />;
  if (!data) return <Loading />;
  const link = "inline-flex min-h-11 items-center rounded-lg border border-[#c9cfd8] px-4 text-sm font-semibold hover:bg-soft";
  return (
    <>
    <Card className="px-5 pb-2 pt-5">
      <CardTitle aside={data.recipients.length ? `Emailed on the 1st to ${data.recipients.length} ${data.recipients.length === 1 ? "person" : "people"}` : "No recipients set. Add them in Settings."}>Monthly reports</CardTitle>
      {data.months.map((m) => (
        <div key={m.period} className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft py-3.5">
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{m.label}</span>
            <span className="text-sm text-muted">{m.in_progress ? "In progress, updates as the month goes on" : "Complete"}</span>
          </span>
          <span className="flex gap-2.5">
            <a className={link} href={`/api/sites/${id}/reports/${m.period}.html`} target="_blank" rel="noreferrer">View</a>
            <a className={link} href={`/api/sites/${id}/reports/${m.period}.pdf`}>PDF</a>
          </span>
        </div>
      ))}
    </Card>
    </>
  );
}

// ---- Subscriptions for this site ---------------------------------------------
export function SiteSubscriptionsTab({ site }: { site: SiteDetail }) {
  const { data, error, mutate: retry } = useSWR<SubscriptionsResponse>(`/api/subscriptions?site=${site.id}`, fetcher);
  if (error) return <ErrorState message={error.message} retry={() => retry()} />;
  if (!data) return <Loading />;
  return (
    <Card className="px-5 pb-2 pt-5">
      <CardTitle aside={<Link href={`/subscriptions/new?site=${site.id}`} className={btn.primary}>Add subscription</Link>}>Subscriptions for {site.name}</CardTitle>
      {data.subscriptions.length === 0 && <Empty icon={Receipt} title="No subscriptions yet" action={<Link href={`/subscriptions/new?site=${site.id}`} className={btn.primary}>Add subscription</Link>}>Add the domain, hosting and tools this site depends on.</Empty>}
      {data.subscriptions.map((s) => (
        <Link key={s.id} href={`/subscriptions/${s.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line-soft py-4 hover:bg-soft">
          <span className="flex min-w-[240px] flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{s.name}</span>
            <span className="text-sm text-muted">{s.provider ?? "—"} · {s.cycle === "monthly" ? "Monthly" : "Yearly"}</span>
          </span>
          <span className="font-mono text-sm">{money(s.currency, s.amount)}</span>
          <span className="text-sm text-muted">Renews {fmtDate(s.next_renewal)} ({daysUntil(s.next_renewal)} days)</span>
          <SubStatusChip status={s.status} />
        </Link>
      ))}
    </Card>
  );
}

// ---- Settings ---------------------------------------------------------------
export function SettingsTab({ site }: { site: SiteDetail }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await send("PATCH", `/api/sites/${site.id}`, {
        name: f.get("name"), url: f.get("url"), keyword: f.get("keyword"),
        report_to: splitEmails(f.get("report_to")), alert_to: splitEmails(f.get("alert_to")),
        audit: f.get("audit") === "on",
      });
      await Promise.all([mutate(`/api/sites/${site.id}`), mutate("/api/sites")]);
      toast.success("Saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Stop monitoring ${site.name}? Its history stays on the server, but it disappears from the dashboard.`)) return;
    await send("DELETE", `/api/sites/${site.id}`);
    await mutate("/api/sites");
    router.replace("/overview");
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <Card className="p-5">
        <form onSubmit={save} className="flex flex-col gap-5">
          <Field label="Name" htmlFor="name"><input id="name" name="name" required defaultValue={site.name} className={input} /></Field>
          <Field label="Address" htmlFor="url"><input id="url" name="url" required defaultValue={site.url} className={input} /></Field>
          <Field label="Text the page must contain" htmlFor="keyword" hint="optional"><input id="keyword" name="keyword" defaultValue={site.keyword ?? ""} className={input} /></Field>
          <Field label="Monthly report goes to" htmlFor="report_to" hint="separate emails with commas"><input id="report_to" name="report_to" defaultValue={site.report_to.join(", ")} className={input} /></Field>
          <Field label="Extra people to alert when it goes down" htmlFor="alert_to" hint="optional"><input id="alert_to" name="alert_to" defaultValue={site.alert_to.join(", ")} className={input} /></Field>
          <label className="flex min-h-11 items-center gap-3 text-[15px]"><input type="checkbox" name="audit" defaultChecked={site.audit_enabled} className="size-5" />Run the nightly audit</label>
          <div className="flex justify-end"><button type="submit" disabled={busy} className={btn.primary}>{busy ? "Saving…" : "Save changes"}</button></div>
        </form>
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Stop monitoring this website</h2>
          <p className="text-sm text-muted">Checks and alerts stop. History is kept on the server and its subscriptions stay, unlinked.</p>
        </div>
        <button onClick={remove} className={btn.danger}>Remove website</button>
      </Card>
    </div>
  );
}

