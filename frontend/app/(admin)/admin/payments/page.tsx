"use client";

import useSWR from "swr";
import { Card, Empty, ErrorState, PageHeader, Skeleton, Tile } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { fmtAgo } from "@/lib/format";
import { ghs } from "@/lib/me";

interface Row { reference: string; workspace: string; workspace_id: number; plan_id: string; cycle: string; amount: number; status: string; channel: string | null; created: number; paid: number | null; kind: string }

export default function AdminPayments() {
  const { data, error, mutate } = useSWR<{ payments: Row[]; failed: number }>("/api/admin/payments", fetcher);
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-64" />;
  const paid = data.payments.filter((p) => p.status === "success");
  return (
    <>
      <PageHeader title="Payments" subtitle="Every charge from Paystack, newest first." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Collected (last 100)" value={ghs(paid.reduce((s, p) => s + p.amount, 0))} /><Tile label="Successful" value={paid.length} tone="ok" />
        <Tile label="Failed or abandoned" value={data.failed} tone={data.failed ? "warn" : "muted"} /></div>
      <Card className="overflow-x-auto">
        {data.payments.length === 0 ? <Empty title="No payments yet" /> : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead><tr className="border-b border-line bg-soft text-xs uppercase tracking-wide text-muted"><th className="px-5 py-3">Date</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Reference</th></tr></thead>
            <tbody>{data.payments.map((p) => (
              <tr key={p.reference} className="border-b border-line-soft last:border-0"><td className="px-5 py-3">{fmtAgo(p.paid ?? p.created)}</td><td className="px-5 py-3 font-semibold">{p.workspace}</td>
                <td className="px-5 py-3 capitalize">{p.plan_id} · {p.cycle}</td><td className="px-5 py-3 font-mono">{ghs(p.amount)}</td><td className="px-5 py-3">{p.channel ?? "—"}</td>
                <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.status === "success" ? "bg-ok-soft text-ok" : p.status === "pending" ? "bg-line-soft text-ink-2" : "bg-bad-soft text-bad"}`}>{p.status}</span></td>
                <td className="px-5 py-3 font-mono text-xs text-muted">{p.reference}</td></tr>))}</tbody>
          </table>)}
      </Card>
    </>
  );
}
