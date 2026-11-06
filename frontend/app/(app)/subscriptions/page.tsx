"use client";

import { opts, Select } from "@/components/select";
import { CalendarClock, CalendarDays, FileWarning, Receipt, SearchX, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { btn, Card, Empty, ErrorState, Icon, PageHeader, Skeleton, SubStatusChip, Tile } from "@/components/ui";
import { fetcher, type SubStatus, type SubscriptionsResponse } from "@/lib/api";
import { fmtDate, money, moneyMap } from "@/lib/format";

const cols = "grid grid-cols-[minmax(220px,2fr)_minmax(140px,1.2fr)_90px_100px_120px_130px_110px] items-center gap-4";
const FILTERS: [string, string][] = [["all", "All"], ["active", "Active"], ["soon", "Renews soon"], ["expired", "Expired"], ["cancelled", "Cancelled"]];

export default function SubscriptionsPage() {
  const { data, error, mutate, isLoading } = useSWR<SubscriptionsResponse>("/api/subscriptions", fetcher);
  const [filter, setFilter] = useState("all");
  const [site, setSite] = useState("");
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;

  const s = data?.summary;
  const rows = (data?.subscriptions ?? []).filter((x) => (filter === "all" || x.status === (filter as SubStatus)) && (!site || x.site_id === site));
  const count = (k: string) => (k === "all" ? data?.subscriptions.length : data?.subscriptions.filter((x) => x.status === k).length) ?? 0;
  const siteOptions = Array.from(new Map((data?.subscriptions ?? []).filter((x) => x.site_id).map((x) => [x.site_id!, x.site_name!])).entries());

  return (
    <>
      <PageHeader
        title="Subscriptions"
        subtitle="Domains, hosting, SSL and tools for all your websites, with their invoices."
        actions={
          <>
            <Link href="/subscriptions/reports" className={btn.secondary}>Monthly reports</Link>
            <Link href="/subscriptions/new" className={btn.primary}><Icon.upload />Add subscription</Link>
          </>
        }
      />

      <section aria-label="Summary" className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        {s ? (
          <>
            <Tile label="Monthly spend" icon={Wallet} info="What the active subscriptions cost per month. Yearly items are divided by 12 so they are comparable." value={moneyMap(s.monthly)} note="Yearly items spread over 12 months" />
            <Tile label="Yearly total" icon={CalendarDays} info="What the active subscriptions cost over a full year, adding up monthly and yearly items." value={moneyMap(s.yearly)} note={`${s.count} subscription${s.count === 1 ? "" : "s"}`} />
            <Tile label="Renewing in 30 days" icon={CalendarClock} info="Subscriptions that renew within the next 30 days, and how much will be charged. Reminder emails go out before each renewal." value={s.renewing_soon} note={s.renewing_soon ? `${moneyMap(s.due_soon)} due` : "Nothing due"} tone={s.renewing_soon ? "warn" : "muted"} />
            <Tile label="Missing invoices" icon={FileWarning} info="Active subscriptions that have no invoice or receipt uploaded yet. Keeping them on file makes the monthly report complete." value={s.missing_invoices} note={s.expired ? `${s.expired} expired` : "None expired"} tone={s.expired || s.missing_invoices ? "bad" : "muted"} />
          </>
        ) : (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[128px]" />)
        )}
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div role="tablist" aria-label="Filter" className="flex flex-wrap gap-1.5">
            {FILTERS.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
                className={`min-h-10 rounded-lg px-3.5 text-sm ${filter === k ? "bg-brand-soft font-semibold text-brand-ink" : "font-medium text-muted hover:bg-soft"}`}>
                {label} ({count(k)})
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="site" className="text-sm text-muted">Website</label>
            <Select id="site" compact value={site} onChange={setSite} className="min-w-48" options={[{ value: "", label: "All websites" }, ...siteOptions.map(([value, label]) => ({ value, label }))]} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[1020px]">
            <div className={`${cols} border-b border-line bg-soft px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted`}>
              <span>Subscription</span><span>Website</span><span>Billing</span><span>Amount</span><span>Next renewal</span><span>Invoice</span><span>Status</span>
            </div>
            {isLoading && [0, 1, 2].map((i) => <div key={i} className="border-b border-line-soft px-5 py-4"><Skeleton className="h-8" /></div>)}
            {rows.map((r) => (
              <div key={r.id} className={`${cols} min-h-11 border-b border-line-soft px-5 py-3.5`}>
                <Link href={`/subscriptions/${r.id}`} className="flex min-w-0 flex-col gap-0.5 hover:underline">
                  <span className="text-[15px] font-semibold">{r.name}</span>
                  <span className="text-[13px] text-muted">{[r.category, r.provider].filter(Boolean).join(" · ")}</span>
                </Link>
                <span className="text-sm">{r.site_name ?? <span className="text-muted">—</span>}</span>
                <span className="text-sm capitalize text-ink-2">{r.cycle}</span>
                <span className="font-mono text-sm">{money(r.currency, r.amount)}</span>
                <span className="font-mono text-[13px]">{fmtDate(r.next_renewal)}</span>
                <span>
                  {r.latest_invoice ? (
                    <a href={r.latest_invoice.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-brand"><Icon.file />PDF ({r.latest_invoice.period})</a>
                  ) : (
                    <Link href={`/subscriptions/${r.id}`} className="inline-flex min-h-11 items-center text-[13px] font-semibold text-bad">Upload invoice</Link>
                  )}
                </span>
                <span><SubStatusChip status={r.status} /></span>
              </div>
            ))}
            {data && rows.length === 0 && (
              <Empty icon={data.subscriptions.length ? SearchX : Receipt} title={data.subscriptions.length ? "Nothing matches that filter" : "No subscriptions yet"}
                action={data.subscriptions.length ? undefined : <Link href="/subscriptions/new" className={btn.primary}>Add subscription</Link>}>
                {data.subscriptions.length ? "Try another filter." : "Add your domains, hosting and tools to track renewals and costs."}
              </Empty>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
