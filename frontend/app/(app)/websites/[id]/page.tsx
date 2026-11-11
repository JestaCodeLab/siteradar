"use client";

import { useToast } from "@/components/toast";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { RefreshCw } from "lucide-react";
import useSWR, { useSWRConfig } from "swr";
import { DnsTab, DomainTab, SitemapTab } from "@/components/health-tabs";
import { AnalyticsTab, AuditTab, OverviewTab, ReportsTab, SettingsTab, SiteSubscriptionsTab } from "@/components/site-tabs";
import { btn, Crumbs, ErrorState, PlatformBadge, Skeleton, StatusChip } from "@/components/ui";
import { ApiError, fetcher, send, type SiteDetail } from "@/lib/api";
import { fmtAgo } from "@/lib/format";

const TABS = [
  ["overview", "Overview"], ["analytics", "Analytics"], ["audit", "Audit"], ["domain", "Domain"],
  ["dns", "DNS & email"], ["sitemap", "Sitemap"],
  ["reports", "Reports"], ["subscriptions", "Subscriptions"], ["settings", "Settings"],
] as const;

function SiteView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const tab = useSearchParams().get("tab") ?? "overview";
  const { data: site, error, mutate } = useSWR<SiteDetail>(`/api/sites/${id}`, fetcher, {
    refreshInterval: (d) => (d?.audit_running || d?.preview.running || d?.first_run?.checks || d?.first_run?.audit ? 4000 : d && !d.preview.desktop ? 10000 : 60000),
  });
  const toast = useToast();
  const [busy, setBusy] = useState<"check" | "audit" | null>(null);
  const { mutate: refreshAll } = useSWRConfig();
  const [refreshing, setRefreshing] = useState(false);

  if (error) {
    return error instanceof ApiError && error.status === 404
      ? <ErrorState message="We couldn't find that website. It may have been removed." />
      : <ErrorState message={error.message} retry={() => mutate()} />;
  }
  if (!site) return <div className="flex flex-col gap-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;

  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastPeriod = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}`;

  /** Re-reads everything on this page (the details and whichever tab is open) without running a new check. */
  async function refresh() {
    setRefreshing(true);
    await refreshAll((key) => typeof key === "string" && key.startsWith(`/api/sites/${id}`));
    setTimeout(() => setRefreshing(false), 400);
  }
  async function checkNow() {
    setBusy("check");
    try {
      const r = await send<{ ok: boolean; response_ms: number | null; error: string | null }>("POST", `/api/sites/${id}/check`);
      if (r.ok) toast.success(`Up. Responded in ${r.response_ms} ms.`); else toast.error(`Check failed: ${r.error}`);
      await mutate();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Check failed."); }
    setBusy(null);
  }
  async function runAudit() {
    setBusy("audit");
    try {
      await send("POST", `/api/sites/${id}/audit`);
      toast.info("Audit started. Results appear in about a minute.");
      await mutate();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not start the audit."); }
    setBusy(null);
  }

  return (
    <>
      <Crumbs items={[{ label: "Overview", href: "/overview" }, { label: site.name }]} />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[30px] font-semibold leading-tight">{site.name}</h1>
            <StatusChip status={site.status} />
            <PlatformBadge platform={site.platform} />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <a href={site.url} target="_blank" rel="noreferrer" className="font-mono text-brand">{site.host} ↗</a>
            <span>Last check {fmtAgo(site.last_check)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button onClick={refresh} disabled={refreshing} aria-label="Refresh this page" title="Refresh" className={`${btn.secondary} !px-3.5`}><RefreshCw size={18} className={refreshing ? "animate-spin" : ""} aria-hidden="true" /></button>
          <button onClick={checkNow} disabled={busy !== null} className={btn.secondary}>{busy === "check" ? "Checking…" : "Check now"}</button>
          <button onClick={runAudit} disabled={busy !== null || site.audit_running} className={btn.secondary}>{site.audit_running ? "Audit running…" : "Run audit"}</button>
          <a href={`/api/sites/${id}/reports/${lastPeriod}.pdf`} className={btn.primary}>Latest report (PDF)</a>
        </div>
      </header>

      <div role="tablist" aria-label="Website sections" className="flex flex-wrap gap-1 border-b border-[#d9dde4]">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key}
            onClick={() => router.replace(key === "overview" ? `/websites/${id}` : `/websites/${id}?tab=${key}`, { scroll: false })}
            className={`-mb-px min-h-11 border-b-[3px] px-4 text-[15px] ${tab === key ? "border-brand font-semibold text-ink" : "border-transparent font-medium text-muted hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab site={site} onChange={() => mutate()} />}
      {tab === "analytics" && <AnalyticsTab id={id} />}
      {tab === "audit" && <AuditTab id={id} />}
      {tab === "domain" && <DomainTab site={site} />}
      {tab === "dns" && <DnsTab id={id} />}
      {tab === "sitemap" && <SitemapTab id={id} />}
      {tab === "reports" && <ReportsTab id={id} />}
      {tab === "subscriptions" && <SiteSubscriptionsTab site={site} />}
      {tab === "settings" && <SettingsTab site={site} />}
      {!TABS.some(([k]) => k === tab) && <Link href={`/websites/${id}`} className={btn.secondary}>Back to overview</Link>}
    </>
  );
}

export default function SitePage() {
  return <Suspense fallback={<Skeleton className="h-64" />}><SiteView /></Suspense>;
}
