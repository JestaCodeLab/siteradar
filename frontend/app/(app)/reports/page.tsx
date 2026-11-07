"use client";

import { BarChart3, Download, FileText, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Select } from "@/components/select";
import { useToast } from "@/components/toast";
import { btn, Card, Empty, ErrorState, PageHeader, Skeleton, StatusChip } from "@/components/ui";
import { fetcher, send, type ReportHistory, type ReportHistoryMonth, type SitesResponse } from "@/lib/api";
import { fmtDateTs, fmtMs, fmtNum, fmtPct } from "@/lib/format";
import { useMe } from "@/lib/me";

const cols = "grid grid-cols-[minmax(170px,1.6fr)_86px_96px_86px_70px_84px_minmax(150px,1.3fr)_190px] items-center gap-4";
const mono = "font-mono text-sm";

/** The next day the monthly reports go out: this month's report day if it has not passed, otherwise next month's. */
function nextAutomatic(day: number): string {
  const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let d = new Date(now.getFullYear(), now.getMonth(), day);
  if (d < today) d = new Date(now.getFullYear(), now.getMonth() + 1, day);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const generatedText = (m: ReportHistoryMonth) =>
  m.generated ? `${fmtDateTs(m.generated)} · ${m.auto ? "Auto" : "On request"}` : "Made when you open it";

export default function ReportsPage() {
  const { ws, canWrite } = useMe();
  const toast = useToast();
  const [tab, setTab] = useState<"websites" | "socials">("websites");
  const [siteId, setSiteId] = useState("");
  const [picked, setPicked] = useState<{ site: string; month: string } | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [done, setDone] = useState<{ site: string; period: string; label: string } | null>(null);

  const sites = useSWR<SitesResponse>("/api/sites", fetcher);
  const list = sites.data?.sites ?? [];
  const chosen = siteId || (list.length === 1 ? list[0].id : "");
  const site = list.find((s) => s.id === chosen);
  const history = useSWR<ReportHistory>(chosen ? `/api/sites/${chosen}/report-history` : null, fetcher);
  const months = history.data?.months ?? [];
  const month = picked && picked.site === chosen ? picked.month : months[0]?.period ?? "";
  const current = months.find((m) => m.period === month);
  const exists = !!current?.generated;

  async function generate() {
    if (!current || running) return;
    setRunning(current.period); setDone(null);
    try {
      await send("POST", `/api/sites/${chosen}/reports/${current.period}/generate`, {});
      await history.mutate();
      setDone({ site: chosen, period: current.period, label: current.label });
    } catch (e) {
      toast.error("Could not generate the report.", e instanceof Error ? e.message : undefined);
    }
    setRunning(null);
  }

  if (sites.error) return <ErrorState message={sites.error.message} retry={() => sites.mutate()} />;

  const tabBtn = (on: boolean) => `inline-flex min-h-12 items-center gap-2 border-b-[3px] px-[18px] text-[15px] ${on ? "-mb-px border-brand font-semibold text-brand-ink" : "-mb-px border-transparent font-medium text-ink-2 hover:text-ink"}`;
  const pdf = (m: ReportHistoryMonth) => (
    <a href={`/api/sites/${chosen}/reports/${m.period}.pdf`} aria-label={`Download ${m.label} report as PDF`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-brand-ink hover:bg-soft"><Download aria-hidden="true" size={15} />PDF</a>
  );
  const view = (m: ReportHistoryMonth) => (
    <a href={`/api/sites/${chosen}/reports/${m.period}.html`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg border border-[#c9cfd8] px-3 text-[13px] font-semibold hover:bg-soft">View</a>
  );

  return (
    <>
      <PageHeader title="Reports" subtitle="Monthly reports are created automatically on the report day you chose in Settings. You can also generate one for any month." />

      <div role="tablist" aria-label="Report type" className="flex gap-1 border-b border-line">
        <button role="tab" aria-selected={tab === "websites"} onClick={() => setTab("websites")} className={tabBtn(tab === "websites")}>Websites</button>
        <button role="tab" aria-selected={tab === "socials"} onClick={() => setTab("socials")} className={tabBtn(tab === "socials")}>Socials<span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">Coming soon</span></button>
      </div>

      {tab === "socials" && (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-warn-soft text-warn"><Share2 aria-hidden="true" size={26} /></span>
          <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-warn">Coming soon</span>
          <h2 className="text-[22px] font-semibold">Social media reports are on the way</h2>
          <p className="max-w-[480px] text-[15px] leading-relaxed text-muted">Soon you will be able to connect your social accounts and get monthly reports for them here, next to your website reports.</p>
          <button onClick={() => setTab("websites")} className={`${btn.secondary} mt-1`}>Back to website reports</button>
        </Card>
      )}

      {tab === "websites" && (
        <>
          {!sites.data && <Skeleton className="h-28" />}
          {sites.data && list.length === 0 && (
            <Card><Empty icon={FileText} title="No websites yet" action={<Link href="/websites" className={btn.primary}>Go to websites</Link>}>Add a website and its monthly reports will appear here.</Empty></Card>
          )}

          {list.length > 0 && (
            <Card className="flex flex-wrap items-end gap-x-6 gap-y-4 p-5">
              <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-2 md:max-w-[520px]">
                <label htmlFor="rp-site" className="text-sm font-semibold">Website</label>
                <Select id="rp-site" searchable value={chosen} onChange={(v) => { setSiteId(v); setDone(null); }} placeholder="Search or choose a website"
                  options={list.map((s) => ({ value: s.id, label: s.name, hint: s.host }))} />
              </div>
              {site && (
                <div className="flex flex-[1_1_300px] flex-wrap gap-x-7 gap-y-3 pb-1 text-sm">
                  <span className="flex flex-col gap-1"><span className="text-muted">Status</span><StatusChip status={site.status} /></span>
                  <span className="flex flex-col gap-1"><span className="text-muted">Reports</span><span className="font-semibold">{history.data ? `${months.length} ${months.length === 1 ? "report" : "reports"}` : "…"}</span></span>
                  <span className="flex flex-col gap-1"><span className="text-muted">Next automatic report</span><span className="font-semibold">{nextAutomatic(ws?.report_day ?? 1)}</span></span>
                </div>
              )}
            </Card>
          )}

          {list.length > 0 && !chosen && (
            <Card className="flex flex-col items-center gap-3 border-dashed px-6 py-14 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"><BarChart3 aria-hidden="true" size={26} /></span>
              <h2 className="text-xl font-semibold">Choose a website to see its reports</h2>
              <p className="max-w-[460px] text-[15px] leading-relaxed text-muted">Search for a website above. You will see every monthly report for it, and you can generate a new one.</p>
            </Card>
          )}

          {chosen && history.error && <ErrorState message={history.error.message} retry={() => history.mutate()} />}
          {chosen && !history.data && !history.error && <Skeleton className="h-72" />}

          {chosen && history.data && (
            <>
              <Card className="flex flex-col gap-4 p-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="flex flex-col gap-1"><h2 className="text-lg font-semibold">Generate a report</h2><p className="text-sm text-muted">Pick a month. The current month covers the days so far.</p></div>
                  {canWrite ? (
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex min-w-[240px] flex-col gap-1.5"><label htmlFor="rp-month" className="text-[13px] font-semibold text-ink-2">Month</label>
                        <Select id="rp-month" value={month} onChange={(v) => { setPicked({ site: chosen, month: v }); setDone(null); }} options={months.map((m) => ({ value: m.period, label: m.in_progress ? `${m.label} (so far)` : m.label }))} /></div>
                      <button onClick={generate} disabled={!!running || !current} className={btn.primary}>{running ? "Generating…" : exists ? "Regenerate report" : "Generate report"}</button>
                    </div>
                  ) : <p className="text-sm text-muted">You have view-only access, so you can read reports but not generate them.</p>}
                </div>
                {canWrite && exists && !running && <p className="text-[13px] text-warn">A report for {current?.label} already exists. Generating again replaces it with fresh data.</p>}
                {running && (
                  <div role="status" className="flex flex-col gap-2.5 rounded-[10px] bg-brand-soft px-4 py-3.5">
                    <span className="text-sm text-brand-ink"><b>Generating the {current?.label} report for {site?.name}.</b> This usually takes under a minute. Please keep this page open.</span>
                    <div className="h-1.5 overflow-hidden rounded bg-brand/20"><div className="h-1.5 w-3/5 animate-pulse rounded bg-brand" /></div>
                  </div>
                )}
                {done && done.site === chosen && (
                  <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-ok-soft px-4 py-3">
                    <span className="text-sm text-ok"><b>The {done.label} report is ready.</b> Open it, or download the PDF.</span>
                    <span className="flex flex-wrap gap-2 whitespace-nowrap">
                      <a href={`/api/sites/${chosen}/reports/${done.period}.html`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg bg-ok px-3.5 text-sm font-semibold text-white">View report</a>
                      <a href={`/api/sites/${chosen}/reports/${done.period}.pdf`} className="inline-flex min-h-10 items-center rounded-lg border border-ok/40 bg-surface px-3.5 text-sm font-semibold text-ok">Download PDF</a>
                      <button onClick={() => setDone(null)} className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-ok hover:bg-ok/10">Dismiss</button>
                    </span>
                  </div>
                )}
              </Card>

              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
                  <h2 className="text-lg font-semibold">All reports for {site?.name}</h2><span className="text-sm text-muted">{months.length} {months.length === 1 ? "report" : "reports"}</span>
                </div>

                <div className="hidden overflow-x-auto md:block"><div className="min-w-[980px]">
                  <div className={`${cols} border-b border-line bg-soft px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted`}>
                    <span>Month</span><span>Uptime</span><span>Response</span><span>Incidents</span><span>Audit</span><span>Visitors</span><span>Generated</span><span>Report</span>
                  </div>
                  {months.map((m) => (
                    <div key={m.period} className={`${cols} min-h-[56px] border-b border-line-soft px-5 py-2.5 ${done?.site === chosen && done.period === m.period ? "bg-ok-soft/40" : ""}`}>
                      <span className="min-w-0"><span className="flex items-center gap-2 text-[15px] font-semibold">{m.label}{done?.site === chosen && done.period === m.period && <span className="rounded-full bg-ok-soft px-2 py-0.5 text-xs font-semibold text-ok">New</span>}</span><span className="block text-[13px] text-muted">{m.range}{m.in_progress ? " (so far)" : ""}</span></span>
                      <span className={mono}>{fmtPct(m.uptime)}</span><span className={mono}>{fmtMs(m.avg_ms)}</span><span className={mono}>{m.incidents}</span>
                      <span className={mono}>{m.audit ?? "—"}</span><span className={mono}>{fmtNum(m.visitors)}</span>
                      <span className="text-[13px] text-ink-2">{generatedText(m)}</span>
                      <span className="flex gap-1.5">{view(m)}{pdf(m)}</span>
                    </div>
                  ))}
                </div></div>

                <ul className="md:hidden">
                  {months.map((m) => (
                    <li key={m.period} className="flex flex-col gap-3 border-b border-line-soft px-5 py-4">
                      <div className="flex items-baseline justify-between gap-2"><span className="text-[15px] font-semibold">{m.label}</span><span className="text-[13px] text-muted">{m.range}{m.in_progress ? " (so far)" : ""}</span></div>
                      <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                        {[["Uptime", fmtPct(m.uptime)], ["Response", fmtMs(m.avg_ms)], ["Incidents", String(m.incidents)], ["Audit", String(m.audit ?? "—")], ["Visitors", fmtNum(m.visitors)]].map(([k, v]) => (
                          <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-mono font-semibold">{v}</dd></div>))}
                      </dl>
                      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[13px] text-ink-2">{generatedText(m)}</span><span className="flex gap-1.5">{view(m)}{pdf(m)}</span></div>
                    </li>
                  ))}
                </ul>
                <p className="px-5 py-3 text-[13px] text-muted">Reports are kept for {history.data.keep_months} {history.data.keep_months === 1 ? "month" : "months"}. Auto means created on your report day.</p>
              </Card>
            </>
          )}
        </>
      )}
    </>
  );
}
