"use client";

import { AddWebsiteButton } from "@/components/add-website";
import Link from "next/link";
import useSWR from "swr";
import { SitesTable } from "@/components/sites-table";
import { btn, ErrorState, PageHeader } from "@/components/ui";
import { fetcher, type SitesResponse } from "@/lib/api";
import { fmtAgo } from "@/lib/format";
import { useMe } from "@/lib/me";

export default function WebsitesPage() {
  const { ws, canWrite, isAdmin, role } = useMe();
  const { data, error, mutate, isLoading } = useSWR<SitesResponse>("/api/sites", fetcher, { refreshInterval: 60000 });
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  const s = data?.summary;
  const used = ws?.usage.sites ?? 0, limit = ws?.plan.sites ?? 0;
  const atLimit = !!ws && used >= limit;
  const next = { freelance: "Starter", starter: "Growth", growth: "Scale" }[ws?.plan_id ?? ""];

  return (
    <>
      <PageHeader title="Websites"
        subtitle={s ? (atLimit ? `${s.total} websites monitored · checks every ${s.check_interval_minutes} minutes`
          : `${s.total} website${s.total === 1 ? "" : "s"} monitored · last check ${fmtAgo(s.latest_check)} · checks every ${s.check_interval_minutes} minutes`) : "Loading…"}
        actions={canWrite && !atLimit ? <AddWebsiteButton className={btn.primary} /> : (
          <div className="flex flex-col items-end gap-1"><span aria-disabled="true" className="inline-flex min-h-11 cursor-not-allowed items-center rounded-lg bg-[#c9cfd8] px-5 text-sm font-semibold text-white">Add website</span>
            <span className="text-xs text-muted">{atLimit ? "Website limit reached" : "View-only access"}</span></div>)} />

      {atLimit && canWrite && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3.5 rounded-[14px] bg-warn-soft px-[22px] py-4">
          <span className="max-w-[640px] text-[15px] leading-relaxed text-warn"><b>You are using all {limit} website{limit === 1 ? "" : "s"} on the {ws?.plan.name} plan.</b> Your sites keep running. Upgrade to add more.</span>
          {isAdmin && next && <Link href="/settings?tab=billing" className={btn.primary}>Upgrade to {next}</Link>}
        </div>
      )}
      {role === "viewer" && <p role="status" className="rounded-xl bg-[#e8ebf0] px-5 py-3.5 text-sm leading-relaxed text-ink-2"><b>You have view-only access.</b> You can see dashboards and reports. Ask an admin if you need to add or change websites.</p>}

      <SitesTable sites={data?.sites} loading={isLoading} full />
    </>
  );
}
