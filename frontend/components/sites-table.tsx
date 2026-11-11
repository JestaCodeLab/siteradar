"use client";

import { AddWebsiteButton } from "@/components/add-website";
import { Globe } from "lucide-react";
import Link from "next/link";
import { StripLegend, UptimeStrip } from "@/components/charts";
import { Card, Empty, PlatformBadge, Skeleton, StatusChip } from "@/components/ui";
import type { SiteCard } from "@/lib/api";
import { fmtDate, fmtMs, fmtNum, fmtPct } from "@/lib/format";

const mono = "font-mono text-sm";
const FULL = "grid grid-cols-[minmax(200px,2fr)_96px_minmax(220px,2.2fr)_92px_92px_104px_70px_90px] items-center gap-4";
const SHORT = "grid grid-cols-[minmax(200px,2fr)_96px_minmax(160px,1.6fr)_90px_110px] items-center gap-4";

/** The list of websites. The dashboard shows the short version; the Websites page shows every column. */
export function SitesTable({ sites, loading, full = false }: { sites?: SiteCard[]; loading: boolean; full?: boolean }) {
  const cols = full ? FULL : SHORT;
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className={full ? "min-w-[1040px]" : "min-w-[640px]"}>
          <div className={`${cols} border-b border-line bg-soft px-5 py-3 text-xs font-semibold uppercase tracking-[0.04em] text-muted`}>
            <span>Website</span><span>Status</span><span>Last 30 days</span><span>Uptime</span>
            {full && <span>Response</span>}<span>SSL expires</span>{full && <><span>Audit</span><span>Visitors</span></>}
          </div>
          {loading && [0, 1, 2].map((i) => <div key={i} className="border-b border-line-soft px-5 py-4"><Skeleton className="h-8" /></div>)}
          {sites?.map((r) => (
            <Link key={r.id} href={`/websites/${r.id}`} className={`${cols} min-h-11 border-b border-line-soft px-5 py-4 hover:bg-soft`}>
              <span className="flex min-w-0 flex-col"><span className="text-[15px] font-semibold">{r.name}</span><span className="truncate font-mono text-[13px] text-muted">{r.host}</span><span className="mt-1 flex flex-wrap items-center gap-1.5"><PlatformBadge platform={r.platform} /></span>{r.tracking_verified === false && <span className="mt-1 w-fit rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-warn">Setup incomplete: install the snippet</span>}</span>
              <span><StatusChip status={r.status} /></span>
              <UptimeStrip days={r.strip} />
              <span className={mono}>{fmtPct(r.uptime30)}</span>
              {full && <span className={mono}>{r.status === "down" ? "—" : fmtMs(r.response_ms)}</span>}
              <span className="font-mono text-[13px]" title={r.ssl_days == null ? undefined : `${r.ssl_days} days left`}>{r.ssl_expires ? fmtDate(r.ssl_expires) : "—"}</span>
              {full && <><span className={mono}>{r.audit_score ?? "—"}</span><span className={mono}>{fmtNum(r.visitors30)}</span></>}
            </Link>
          ))}
          {sites && sites.length === 0 && <Empty icon={Globe} title="No websites yet" action={<AddWebsiteButton className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover" />}>Add your first website to start monitoring it.</Empty>}
        </div>
      </div>
      <div className="px-5 py-3.5"><StripLegend /></div>
    </Card>
  );
}
