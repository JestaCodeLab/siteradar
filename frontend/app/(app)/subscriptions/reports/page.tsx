"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { HBar } from "@/components/charts";
import { btn, Card, Empty, ErrorState, PageHeader, Skeleton } from "@/components/ui";
import { fetcher, send, type SubReport, type SubReportMonths } from "@/lib/api";
import { fmtDay, money, moneyMap } from "@/lib/format";

function Report({ period }: { period: string }) {
  const { data: r, error, mutate } = useSWR<SubReport>(`/api/subscription-reports/${period}`, fetcher);
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!r) return <Skeleton className="h-[640px] flex-[1_1_560px]" />;
  const kpi = "flex flex-col gap-1.5 rounded-[10px] bg-soft p-4";
  const cur = Object.keys(r.total)[0] ?? "USD";
  const diff = (r.total[cur] ?? 0) - (r.previous_total[cur] ?? 0);
  const section = "flex min-w-0 flex-[1_1_280px] flex-col gap-3.5";
  return (
    <article aria-label={`${r.label} report`} className="flex min-w-0 flex-[1_1_560px] flex-col gap-7 rounded-xl border border-line bg-surface p-5 sm:p-8">
      <div className="flex flex-wrap justify-between gap-3 border-b border-line pb-5">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold uppercase tracking-wide text-muted">Subscription report</span>
          <h2 className="text-[28px] font-semibold">{r.label}{r.in_progress && <span className="text-lg font-medium text-muted"> (in progress)</span>}</h2>
        </div>
        <span className="text-sm text-muted">Generated {r.generated} · all websites</span>
      </div>

      <section aria-label="Totals" className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
        <div className={kpi}><span className="text-[13px] text-muted">{r.in_progress ? "Spent or due this month" : `Spent in ${r.label.split(" ")[0]}`}</span><span className="text-[26px] font-semibold leading-tight">{moneyMap(r.total)}</span>
          <span className="text-[13px] text-muted">{Math.abs(diff) < 0.005 ? "Same as last month" : `${diff > 0 ? "+" : "−"}${money(cur, Math.abs(diff))} vs last month`}</span></div>
        <div className={kpi}><span className="text-[13px] text-muted">Active subscriptions</span><span className="text-[26px] font-semibold leading-tight">{r.active_count}</span>
          {r.expired_count > 0 && <span className="text-[13px] font-medium text-bad">{r.expired_count} expired</span>}</div>
        <div className={kpi}><span className="text-[13px] text-muted">Due in {r.next_label}</span><span className="text-[26px] font-semibold leading-tight">{moneyMap(r.next_total)}</span>
          <span className="text-[13px] text-muted">{r.upcoming.length} renewal{r.upcoming.length === 1 ? "" : "s"}</span></div>
        <div className={kpi}><span className="text-[13px] text-muted">Invoices on file</span><span className="text-[26px] font-semibold leading-tight">{r.invoices_on_file} of {r.invoices_due}</span>
          {r.invoices_on_file < r.invoices_due && <span className="text-[13px] font-medium text-warn">{r.invoices_due - r.invoices_on_file} missing</span>}</div>
      </section>

      {r.actions.length > 0 && (
        <section aria-label="What to do next" className="flex flex-col gap-2.5">
          <h3 className="text-lg font-semibold">What to do next</h3>
          {r.actions.map((a) => (
            <div key={a.text} className="flex flex-wrap items-center gap-3 rounded-[10px] border border-line px-4 py-3.5">
              <span className={`min-w-[74px] rounded-full px-2.5 py-1 text-center text-xs font-semibold ${a.level === "urgent" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"}`}>{a.level === "urgent" ? "Urgent" : "Soon"}</span>
              <span className="min-w-[260px] flex-1 text-[15px] leading-relaxed">{a.text}</span>
            </div>
          ))}
        </section>
      )}

      <div className="flex flex-wrap gap-7">
        {([["Spend by website", r.by_site, "bg-brand"], ["Spend by category", r.by_category, "bg-ok"]] as const).map(([title, data, color]) => (
          <section key={title} aria-label={title} className={section}>
            <h3 className="text-lg font-semibold">{title}</h3>
            {Object.entries(data).length === 0 && <p className="text-sm text-muted">No charges this month.</p>}
            {Object.entries(data).map(([c, rows]) => rows.map(([name, amt]) => <HBar key={c + name} label={name} value={money(c, amt)} pct={(100 * amt) / rows[0][1]} color={color} />))}
          </section>
        ))}
      </div>

      <section aria-label="Charges" className="flex flex-col gap-1.5">
        <h3 className="mb-1.5 text-lg font-semibold">Charged in {r.label.split(" ")[0]}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead><tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="py-2.5 pr-3 font-semibold">Date</th><th className="pr-3 font-semibold">Subscription</th><th className="pr-3 font-semibold">Website</th><th className="pr-3 font-semibold">Amount</th><th className="font-semibold">Invoice</th>
            </tr></thead>
            <tbody>
              {r.charges.map((c) => (
                <tr key={c.subscription_id} className="border-b border-line-soft">
                  <td className="py-2 pr-3 font-mono text-[13px]">{fmtDay(c.date)}</td>
                  <td className="pr-3 font-medium"><Link href={`/subscriptions/${c.subscription_id}`} className="hover:underline">{c.name}</Link></td>
                  <td className="pr-3">{c.site}</td>
                  <td className="pr-3 font-mono">{money(c.currency, c.amount)}</td>
                  <td>
                    {c.invoice ? <a href={c.invoice.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-medium text-brand">View PDF</a>
                      : c.future ? <span className="text-muted">Not due yet</span>
                      : <Link href={`/subscriptions/${c.subscription_id}`} className="inline-flex min-h-11 items-center font-semibold text-bad">Upload</Link>}
                  </td>
                </tr>
              ))}
              {r.charges.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted">No charges this month.</td></tr>}
            </tbody>
            {r.charges.length > 0 && <tfoot><tr><td /><td className="py-3 font-semibold">Total</td><td /><td className="font-mono font-semibold">{moneyMap(r.total)}</td><td /></tr></tfoot>}
          </table>
        </div>
      </section>

      <section aria-label="Upcoming renewals" className="flex flex-col">
        <h3 className="mb-1.5 text-lg font-semibold">Renewing in {r.next_label}</h3>
        {r.upcoming.length === 0 && <p className="border-t border-line-soft py-3 text-sm text-muted">Nothing renews next month.</p>}
        {r.upcoming.map((u) => (
          <div key={u.name + u.date} className="flex flex-wrap justify-between gap-2 border-t border-line-soft py-3 text-sm">
            <span><span className="mr-3 font-mono text-[13px] text-muted">{fmtDay(u.date)}</span><span className="font-medium">{u.name}</span> · {u.site}</span>
            <span className="font-mono">{money(u.currency, u.amount)}</span>
          </div>
        ))}
      </section>
    </article>
  );
}

export default function SubscriptionReportsPage() {
  const { data, error, mutate } = useSWR<SubReportMonths>("/api/subscription-reports", fetcher);
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  const period = picked ?? data?.months[0]?.period;

  async function email() {
    if (!period) return;
    setSending(true); setNote(null);
    try {
      const r = await send<{ sent: boolean; to: string[] }>("POST", `/api/subscription-reports/${period}/email`);
      setNote(`Sent to ${r.to.join(", ")}.`);
    } catch {
      setNote("Could not send the email. Check the email settings on the server.");
    }
    setSending(false);
  }

  return (
    <>
      <PageHeader
        title="Monthly reports"
        subtitle={data?.recipients.length ? `Generated on the 1st of each month and emailed to ${data.recipients.length} people.` : "Generated on the 1st of each month."}
        actions={period && (
          <>
            <button onClick={email} disabled={sending} className={btn.secondary}>{sending ? "Sending…" : "Email to team"}</button>
            <a href={`/api/subscription-reports/${period}.pdf`} className={btn.primary}>Download PDF</a>
          </>
        )}
      />
      {note && <p role="status" className="rounded-lg bg-brand-soft px-4 py-2.5 text-sm text-brand-ink">{note}</p>}
      {data && data.months.length === 0 && <Card><Empty title="No reports yet">Add a subscription and its first report appears here.</Empty></Card>}
      {data && data.months.length > 0 && period && (
        <div className="flex flex-wrap items-start gap-6">
          <nav aria-label="Report months" className="flex w-full flex-col gap-0.5 rounded-xl border border-line bg-surface p-2.5 sm:w-[220px]">
            {data.months.map((m) => (
              <button key={m.period} onClick={() => setPicked(m.period)} aria-current={m.period === period} className={`flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 text-left text-sm ${m.period === period ? "bg-brand-soft font-semibold text-brand-ink" : "font-medium text-ink-2 hover:bg-soft"}`}>
                {m.label}<span className="font-mono text-[13px]">{moneyMap(m.total)}</span>
              </button>
            ))}
          </nav>
          <Report period={period} />
        </div>
      )}
      {!data && <Skeleton className="h-96" />}
    </>
  );
}
