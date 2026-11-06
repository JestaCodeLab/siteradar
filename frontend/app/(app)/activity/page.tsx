"use client";

import { AddWebsiteButton } from "@/components/add-website";
import { Activity } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { btn, Card, Empty, ErrorState, PageHeader, Skeleton } from "@/components/ui";
import { fetcher, type ActivityEvent } from "@/lib/api";
import { dayLabel, fmtTime } from "@/lib/format";

const FILTERS: [string, string, string[]][] = [
  ["all", "All", []],
  ["incidents", "Incidents", ["down", "recovered"]],
  ["alerts", "Alerts", ["ssl", "slow", "renewal", "domain", "dns"]],
  ["audits", "Audits", ["audit"]],
  ["billing", "Subscriptions", ["subscription", "invoice"]],
];

const dot = { bad: "bg-bad", warn: "bg-bar-warn", ok: "bg-ok", info: "bg-brand" } as const;

export default function ActivityPage() {
  const { data, error, mutate } = useSWR<{ events: ActivityEvent[] }>("/api/activity?limit=200", fetcher, { refreshInterval: 60000 });
  const [filter, setFilter] = useState("all");
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;

  const kinds = FILTERS.find(([k]) => k === filter)![2];
  const events = (data?.events ?? []).filter((e) => !kinds.length || kinds.includes(e.kind));
  const days: [string, ActivityEvent[]][] = [];
  for (const e of events) {
    const label = dayLabel(e.ts);
    const last = days[days.length - 1];
    if (last && last[0] === label) last[1].push(e);
    else days.push([label, [e]]);
  }

  return (
    <>
      <PageHeader title="Activity logs" subtitle="Incidents, alerts, audits and changes across all websites and subscriptions." />
      <div role="tablist" aria-label="Filter" className="flex flex-wrap gap-1.5">
        {FILTERS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
            className={`min-h-10 rounded-lg px-3.5 text-sm ${filter === k ? "bg-brand-soft font-semibold text-brand-ink" : "font-medium text-muted hover:bg-surface"}`}>{label}</button>
        ))}
      </div>

      {!data && <Skeleton className="h-72" />}
      {data && events.length === 0 && <Card><Empty icon={Activity} title="Nothing here yet" action={<AddWebsiteButton className={btn.primary}>Add a website</AddWebsiteButton>}>Events appear as SiteRadar checks your websites and as you add subscriptions.</Empty></Card>}
      {days.map(([label, items]) => (
        <Card key={label} className="px-5 pb-1 pt-4">
          <h2 className="mb-1 text-sm font-semibold text-muted">{label}</h2>
          <ul>
            {items.map((e) => (
              <li key={e.kind + e.ts + e.title} className="flex gap-3.5 border-t border-line-soft py-3.5">
                <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot[e.level]}`} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-medium">{e.title}</span>
                  {e.detail && <span className="text-sm text-muted">{e.detail}</span>}
                  {e.site_id && <Link href={`/websites/${e.site_id}`} className="text-sm font-medium text-brand">{e.site_name}</Link>}
                </span>
                <time className="shrink-0 font-mono text-[13px] text-muted">{fmtTime(e.ts)}</time>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </>
  );
}
