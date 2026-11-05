"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Pill, AdminCard, AdminHeader, TableHead, Tabs, aBtn, downloadCsv, money, shortDate, type Tone } from "@/components/admin/ui";
import { Empty, ErrorState, Skeleton } from "@/components/ui";
import { fetcher, send } from "@/lib/api";

interface Resp {
  tiles: { collected: number; successful: number; failed: number; at_risk: number; refunds: number; momo_pct: number };
  counts: Record<string, number>;
  followup: { reference: string; workspace_id: number; workspace: string; plan: string; method: string; amount: number; created: number }[];
  payments: { reference: string; workspace: string; workspace_id: number; plan_id: string; amount: number; method: string; label: string; created: number; paid: number | null }[];
}
type Filter = "all" | "paid" | "failed" | "pending" | "refunded";
const GRID = "130px minmax(180px,1.6fr) 110px 130px 140px 110px 140px";
const tone: Record<string, Tone> = { Paid: "ok", Failed: "bad", Pending: "warn", Refunded: "muted" };

export default function AdminPayments() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, error, mutate } = useSWR<Resp>(`/api/admin/payments?status=${filter}`, fetcher, { keepPreviousData: true });
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-96" />;
  const t = data.tiles;

  async function act(path: string, ok: (r: { result?: string; sent_to?: string }) => string) {
    setNote(null);
    try { const r = await send<{ result?: string; sent_to?: string }>("POST", path); setNote({ ok: true, text: ok(r) }); await mutate(); }
    catch (e) { setNote({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." }); }
  }

  const tiles = [
    { label: "Collected this month", value: money(t.collected), note: `${t.successful} successful payment${t.successful === 1 ? "" : "s"}`, c: "#0B7A4B" },
    { label: "Failed payments", value: String(t.failed), note: `${money(t.at_risk)} at risk`, c: t.failed ? "#B3261E" : "#5B6472" },
    { label: "Refunds", value: money(t.refunds), note: t.refunds ? "This month" : "None this month", c: "#5B6472" },
    { label: "Paid with mobile money", value: `${t.momo_pct}%`, note: "The rest by card", c: "#5B6472" },
  ];
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" }, { id: "paid", label: "Paid" }, { id: "failed", label: `Failed (${data.counts.failed ?? 0})` },
    { id: "pending", label: "Pending" }, { id: "refunded", label: "Refunded" },
  ];

  return (
    <>
      <AdminHeader title="Payments" subtitle="Every charge from the payment provider." actions={<button onClick={() => downloadCsv(`/api/admin/payments.csv?status=${filter}`, "payments")} className={aBtn.secondary}>Export CSV</button>} />
      {note && <p role="status" className={`rounded-xl px-5 py-3 text-sm ${note.ok ? "bg-[#E3F4EC] text-[#0B7A4B]" : "bg-[#FBE7E5] text-[#B3261E]"}`}>{note.text}</p>}

      <section aria-label="Summary" className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        {tiles.map((x) => (
          <div key={x.label} className="flex flex-col gap-2 rounded-xl border border-[#E2E5EA] bg-white p-5">
            <span className="text-[13px] text-[#5B6472]">{x.label}</span><span className="text-[30px] font-semibold leading-none">{x.value}</span>
            <span style={{ color: x.c }} className="text-[13px] font-medium">{x.note}</span></div>))}
      </section>

      {data.followup.length > 0 && (
        <AdminCard label="Needs follow-up" className="!pb-2">
          <h2 className="mb-2 text-lg font-semibold">Failed payments to follow up</h2>
          {data.followup.map((f) => (
            <div key={f.reference} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#EDEFF3] py-3.5">
              <span className="min-w-0 flex-1"><Link href={`/admin/customers/${f.workspace_id}`} className="block text-[15px] font-semibold text-[#4A33B0]">{f.workspace}</Link>
                <span className="block text-[13px] capitalize text-[#5B6472]">{f.plan} · {f.method} · {shortDate(f.created)}</span></span>
              <span className="font-mono text-sm">GHS {f.amount.toFixed(2)}</span>
              <span className="flex gap-2">
                <button onClick={() => act(`/api/admin/payments/${f.reference}/email`, (r) => `Payment link sent to ${r.sent_to}.`)} className={aBtn.small}>Email customer</button>
                <button onClick={() => act(`/api/admin/payments/${f.reference}/retry`, (r) => (r.result === "charged" ? "Payment collected." : r.result === "link" ? "No saved card, so a payment link was emailed instead." : "The charge failed again."))} className={aBtn.small}>Retry</button></span>
            </div>))}
        </AdminCard>
      )}

      <section aria-label="Transactions" className="overflow-hidden rounded-xl border border-[#E2E5EA] bg-white">
        <div className="border-b border-[#E2E5EA] px-5 py-3.5"><Tabs items={filters} value={filter} onChange={setFilter} /></div>
        <div className="overflow-x-auto"><div className="min-w-[960px]">
          <TableHead template={GRID} cols={["Date", "Customer", "Plan", "Amount", "Method", "Status", "Reference"]} />
          {data.payments.length === 0 && <Empty title="No payments here yet" />}
          {data.payments.map((r) => (
            <div key={r.reference} style={{ display: "grid", gridTemplateColumns: GRID }} className="min-h-12 items-center gap-4 border-b border-[#EDEFF3] px-5 py-3 text-sm">
              <span className="text-[13px] text-[#5B6472]">{shortDate(r.paid ?? r.created)}</span>
              <Link href={`/admin/customers/${r.workspace_id}`} className="truncate font-semibold text-[#4A33B0]">{r.workspace}</Link>
              <span className="capitalize">{r.plan_id}</span><span className="font-mono text-[13px]">GHS {r.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              <span>{r.method}</span><span><Pill tone={tone[r.label] ?? "muted"}>{r.label}</Pill></span>
              <span className="truncate font-mono text-xs text-[#5B6472]">{r.reference}</span>
            </div>))}
        </div></div>
      </section>
    </>
  );
}
