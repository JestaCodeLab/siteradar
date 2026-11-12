"use client";

import { useToast } from "@/components/toast";
import { AlertTriangle, ChevronDown, Receipt, CalendarClock, ClipboardCheck, Eye, MousePointerClick, ShieldCheck, Timer, Users, Zap, Activity, Wrench, X, History, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { fixGuide } from "@/lib/fix-guides";
import { SearchCard, TrafficTabs } from "./search-tab";
import { AI_RULES, AiFixModal } from "./ai-fix-modal";
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
  fetcher, send, type ActivityEvent, type AnalyticsResponse, type AuditResponse, type FixesResponse, type Issue, type ReportMonths, type SiteDetail, type SubscriptionsResponse,
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
      <SearchCard id={id} days={days} />
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
        </>
      )}
      <TrafficTabs id={id} a={a} />
      {!empty && (
        <Card className="flex flex-col gap-4 p-5">
          <CardTitle>Where visitors come from</CardTitle>
          {a.referrers?.map(([name, , pct]) => <HBar key={name} label={name} value={`${pct}%`} pct={pct} />)}
          <p className="text-[13px] leading-relaxed text-muted">Cookieless tracking. No personal data is stored.</p>
        </Card>
      )}
    </div>
  );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3"><span className="text-[13px] font-medium text-ink-2">{label}</span>
        <button type="button" onClick={() => { navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => { /* the code stays selectable */ }); }} className="min-h-8 text-[13px] font-semibold text-brand hover:underline">{copied ? "Copied" : "Copy"}</button></div>
      <pre className="overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-[12.5px] leading-relaxed text-ink"><code>{code}</code></pre>
    </div>
  );
}

function IssueRow({ siteId, issue, fx, onChange, openSetup, host, isWp, platform }: { siteId: string; issue: Issue; fx: FixesResponse | undefined; onChange: () => void; openSetup: () => void; host: string; isWp: boolean; platform: string | null }) {
  const { isAdmin } = useMe();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [open, setOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const item = fx?.items[issue.rule];
  const guide = isWp ? null : fixGuide(issue.rule, platform);
  const pages = issue.examples ?? [];

  useEffect(() => {
    if (!asking) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) setAsking(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asking, busy]);

  async function change(on: boolean) {
    setBusy(true);
    try {
      await send("POST", `/api/sites/${siteId}/fixes/${issue.rule}`, { on });
      toast.success(on ? "Fix switched on." : "Fix removed.", on ? "The plugin applies it within a few seconds." : "The plugin takes it off your website.");
      setAsking(false);
      onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not change the fix."); }
    setBusy(false);
  }

  const undo = (label: string) => isAdmin && <button type="button" onClick={() => change(false)} disabled={busy} className="min-h-9 text-[13px] font-semibold text-brand hover:underline disabled:opacity-60">{label}</button>;
  let control: ReactNode = null;
  if (fx && item) {
    if (item.state === "applied") control = (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 lg:justify-end">
        <span className="rounded-full bg-ok-soft px-2.5 py-1 text-[13px] font-semibold text-ok">Fix applied</span>
        {undo("Undo")}
      </div>);
    else if (item.state === "queued") control = (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 lg:justify-end">
        <span className="rounded-full bg-warn-soft px-2.5 py-1 text-[13px] font-semibold text-warn">Applying…</span>
        {undo("Cancel")}
      </div>);
    else if (!fx.allowed) control = <Link href="/settings?tab=billing" className="text-[13px] font-semibold text-brand hover:underline">Upgrade to fix this with one click</Link>;
    else if (!fx.connected) control = <button type="button" onClick={openSetup} className={btn.secondary}>Connect the plugin to fix this</button>;
    else if (!isAdmin) control = <span className="text-[13px] text-muted">Ask an account admin to apply this fix.</span>;
    else control = <button type="button" onClick={() => setAsking(true)} className={`${btn.primary} whitespace-nowrap`}><Wrench size={15} aria-hidden="true" />Fix this issue</button>;
  }
  // text findings (descriptions, titles, alt text) are fixed with AI drafts that the owner reviews
  if (isWp && fx && !item && AI_RULES.includes(issue.rule)) {
    if (!fx.allowed) control = <Link href="/settings?tab=billing" className="text-[13px] font-semibold text-brand hover:underline">Upgrade to fix this with AI</Link>;
    else if (!fx.connected) control = <button type="button" onClick={openSetup} className={btn.secondary}>Connect the plugin to fix this</button>;
    else if (!isAdmin) control = <span className="text-[13px] text-muted">Ask an account admin to fix this.</span>;
    else control = <button type="button" onClick={() => setAiOpen(true)} className={`${btn.primary} whitespace-nowrap`}><Sparkles size={15} aria-hidden="true" />Fix with AI</button>;
  }
  // websites that cannot be fixed with one click (not WordPress) get a panel that explains the fix instead
  if (!isWp) control = <button type="button" onClick={() => setGuideOpen((o) => !o)} aria-expanded={guideOpen} className={`${btn.secondary} whitespace-nowrap`}>{guideOpen ? "Hide fix" : "Show fix"}<ChevronDown size={16} aria-hidden="true" className={`transition-transform ${guideOpen ? "rotate-180" : ""}`} /></button>;
  const note = item?.state === "applied" ? "It disappears from this list after the next audit." : item?.state === "queued" ? "Waiting for the plugin on your website to confirm." : null;

  return (
    <div className="flex flex-wrap gap-3.5 border-t border-line-soft py-4 lg:flex-nowrap">
      <div className="w-[74px] shrink-0"><SeverityChip severity={issue.severity} /></div>
      <div className={`flex min-w-[260px] flex-1 flex-col gap-1 lg:min-w-0 ${pages.length ? "cursor-pointer" : ""}`}
        onClick={(e) => { if (pages.length && !(e.target as HTMLElement).closest("a, button")) setOpen((o) => !o); }}>
        <span className="flex items-start gap-1.5 text-[15px] font-semibold">
          <span className="min-w-0 flex-1">{issue.title} <span className="font-normal text-muted">· {issue.count} {issue.count === 1 ? "page" : "pages"}</span></span>
          {pages.length > 0 && <button type="button" aria-expanded={open} aria-label={open ? "Hide the affected pages" : "Show the affected pages"} onClick={() => setOpen((o) => !o)} className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-soft"><ChevronDown size={18} aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`} /></button>}
        </span>
        <span className="text-sm leading-relaxed text-ink-2">How to fix: {issue.fix}</span>
        {open && (
          <div className="mt-1.5 rounded-lg border border-line-soft bg-soft p-3.5">
            <span className="text-[13px] font-semibold text-muted">{issue.count === 1 ? "Affected page" : `Affected pages${issue.count > pages.length ? ` (showing ${pages.length} of ${issue.count})` : ""}`}</span>
            <ul className="mt-1.5 flex flex-col gap-2">
              {pages.map((x) => (
                <li key={x.url + x.detail} className="flex min-w-0 flex-col gap-0.5 text-sm">
                  <a href={x.url} target="_blank" rel="noreferrer" className="break-all font-mono text-[13px] text-brand hover:underline">{x.url} ↗</a>
                  {x.detail && <span className="text-[13px] text-muted">{x.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {note && <span className="text-[13px] text-muted">{note}</span>}
        {!isWp && guideOpen && (
          <div className="mt-1.5 flex flex-col gap-3 rounded-lg border border-line-soft bg-soft p-3.5">
            <span className="text-[13px] font-semibold text-muted">How to fix it</span>
            <p className="text-sm leading-relaxed text-ink-2">{guide?.note ?? issue.fix}</p>
            {guide?.example && guide.snippets.length > 0 && <p className="text-[13px] leading-relaxed text-muted">SiteRadar cannot see your code, so treat this as an example. Change the file names and values to match your project.</p>}
            {guide?.snippets.map((sn) => <CodeBlock key={sn.label} label={sn.label} code={sn.code} />)}
            {!guide && <p className="text-[13px] text-muted">This one depends on how your website is built, so there is no ready-made code. Pass the advice above to whoever maintains it.</p>}
          </div>
        )}
        {/* phones: the control sits under the text; wide screens: it moves to the right edge */}
        {control && <div className="mt-1.5 lg:hidden">{item?.state === "available" && <span className="mb-1.5 block text-[13px] leading-relaxed text-muted">{item.what}</span>}{control}</div>}
      </div>
      {control && <div className="hidden shrink-0 lg:flex lg:self-start lg:justify-end">{control}</div>}

      {aiOpen && <AiFixModal siteId={siteId} issue={issue} host={host} onClose={() => setAiOpen(false)} />}
      {asking && item && (
        <div role="dialog" aria-modal="true" aria-labelledby={`fix-${issue.rule}`} className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4">
          <div className="flex max-h-[92vh] w-[min(560px,100%)] flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-surface p-6 text-ink shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
            <div className="flex items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Wrench aria-hidden="true" size={22} /></span>
              <div className="min-w-0 flex-1">
                <h2 id={`fix-${issue.rule}`} className="text-xl font-bold">Fix this issue on <span className="text-brand">{host}</span></h2>
                <p className="mt-0.5 text-[15px] text-muted">Review what will change, then proceed.</p>
              </div>
              <button type="button" onClick={() => setAsking(false)} disabled={busy} aria-label="Close" className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-soft"><X aria-hidden="true" size={18} /></button>
            </div>
            <div className="flex flex-col gap-3.5 text-sm leading-relaxed">
              <div><h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">The problem</h3>
                <p className="mt-1 text-ink-2"><b>{issue.title}</b>, found on {issue.count} {issue.count === 1 ? "page" : "pages"}.</p></div>
              <div><h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">What the fix does</h3>
                <p className="mt-1 text-ink-2">{item.what}</p></div>
              {item.confirm && <p className="rounded-lg bg-warn-soft px-3.5 py-2.5 text-warn">Read this before you proceed: this one is hard to reverse for visitors. Browsers remember it for a long time.</p>}
              <p className="text-muted">The SiteRadar plugin on your website applies it within a few seconds. You can undo it here at any time, and it is recorded in your activity log. The finding leaves the list after the next audit, so run one afterwards to confirm.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2.5">
              <button type="button" onClick={() => setAsking(false)} disabled={busy} className={btn.secondary}>Cancel</button>
              <button type="button" onClick={() => change(true)} disabled={busy} className={btn.primary}>{busy ? "Applying…" : "Proceed and fix"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export function AuditTab({ id, site, onRun, busy }: { id: string; site: SiteDetail; onRun: () => void; busy: boolean }) {
  const { open: openSetup, isWp } = useSetup();
  const [view, setView] = useState<"findings" | "fixed" | "changes">("findings");
  const { data: fx, mutate: refetchFx } = useSWR<FixesResponse>(isWp ? `/api/sites/${id}/fixes` : null, fetcher,
    { refreshInterval: (d) => (d && Object.values(d.items).some((i) => i.state === "queued") ? 4000 : 0) });
  const { data, error, mutate: retry } = useSWR<AuditResponse>(`/api/sites/${id}/audit`, fetcher, { refreshInterval: (d) => (d?.running ? 5000 : 0) });
  if (error) return <ErrorState message={error.message} retry={() => retry()} />;
  if (!data) return <Loading />;
  if (!data.audit) {
    return <Card><Empty icon={ClipboardCheck} title={data.running ? "Audit is running…" : "No audit yet"}>{data.running ? "Results appear in about a minute." : "Audits run every night at 03:00. Press Run audit above to run one now."}</Empty></Card>;
  }
  const { scores, issues } = data.audit;
  // applied fixes whose finding the latest audit no longer reports
  const fixed = fx ? Object.entries(fx.items).filter(([rule, it]) => it.state === "applied" && !issues.some((i) => i.rule === rule)) : [];
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
      <div role="group" aria-label="Audit sections" className="inline-flex max-w-full gap-1 self-end overflow-x-auto rounded-[10px] bg-[#e8ebf0] p-1">
        {([["findings", "Findings", ClipboardCheck], ...(fixed.length || isWp ? [["fixed", `Fixed${fixed.length ? ` (${fixed.length})` : ""}`, CheckCircle2]] : []), ["changes", "Recent changes", History]] as [typeof view, string, typeof History][]).map(([key, label, Glyph]) => (
          <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[7px] px-4 text-sm ${view === key ? "bg-surface font-semibold shadow-sm" : "font-medium text-ink-2"}`}>
            <Glyph size={16} aria-hidden="true" />{label}
          </button>
        ))}
      </div>
      {view === "changes" ? <RecentChanges id={id} /> : view === "fixed" ? (
        <Card className="px-5 pb-2 pt-5">
          <CardTitle aside="Fixes confirmed by the plugin that the latest audit no longer reports">Fixed issues</CardTitle>
          {fixed.length === 0 && <p className="border-t border-line-soft py-4 text-sm text-muted">Nothing here yet. After you apply a fix and run a new audit, the issue moves here from Findings.</p>}
          {fixed.map(([rule, it]) => (
            <div key={rule} className="flex flex-wrap gap-3.5 border-t border-line-soft py-4 lg:flex-nowrap">
              <div className="w-[74px] shrink-0"><SeverityChip severity={it.severity} /></div>
              <div className="flex min-w-[260px] flex-1 flex-col gap-1 lg:min-w-0">
                <span className="text-[15px] font-semibold">{it.title}</span>
                <span className="text-sm leading-relaxed text-ink-2">Fixed by: {it.what}</span>
                {it.since && <span className="text-[13px] text-muted">Applied {fmtDateTime(it.since)}</span>}
              </div>
              <div className="shrink-0 lg:self-start"><span className="rounded-full bg-ok px-3 py-1 text-[13px] font-semibold text-white">Fixed</span></div>
            </div>
          ))}
        </Card>
      ) : (
      <Card className="px-5 pb-2 pt-5">
        <CardTitle aside={
          <span className="flex flex-wrap items-center gap-3">
            <span>{`Audited ${fmtDateTime(data.audit.ts)} · ${data.audit.pages} pages crawled`}</span>
            {isWp && issues.length > 0 && fx && !fx.connected && <button type="button" onClick={openSetup} className={btn.primary}><Wrench size={16} aria-hidden="true" />Connect the plugin to fix issues</button>}
          </span>
        }>Findings</CardTitle>
        {issues.length === 0 && <p className="border-t border-line-soft py-4 text-sm text-ok">No issues found. Nice work.</p>}
        {issues.map((i) => <IssueRow key={i.rule} siteId={id} issue={i} fx={fx} onChange={() => refetchFx()} openSetup={openSetup} host={site.host} isWp={isWp} platform={site.platform?.platform ?? null} />)}
      </Card>
      )}
    </div>
  );
}

/** The latest fixes, manual audits and plugin actions on this website. The full list is on the Activity logs page. */
function RecentChanges({ id }: { id: string }) {
  const { data } = useSWR<{ events: ActivityEvent[] }>(`/api/activity?type=changes&site=${id}&limit=10`, fetcher, { refreshInterval: 30000 });
  if (!data) return <Loading />;
  return (
    <Card className="px-5 pb-2 pt-5">
      <CardTitle aside={<Link href="/activity" className="font-semibold text-brand">See all</Link>}>Recent changes</CardTitle>
      {data.events.length === 0 && <p className="border-t border-line-soft py-4 text-sm text-muted">Nothing yet. Fixes you apply, audits you run by hand and plugin actions on this website are listed here.</p>}
      {data.events.map((e) => (
        <div key={e.kind + e.ts + e.title} className="flex flex-wrap items-start justify-between gap-3 border-t border-line-soft py-3">
          <span className="flex min-w-[240px] flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-medium">{e.title}</span>
            {e.detail && <span className="text-sm text-muted">{e.detail}</span>}
          </span>
          <time className="shrink-0 font-mono text-[13px] text-muted">{fmtDateTime(e.ts)}</time>
        </div>
      ))}
    </Card>
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

