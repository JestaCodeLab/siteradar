"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Card, Empty, ErrorState, input, PageHeader, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { fmtAgo } from "@/lib/format";

export interface CustomerRow { id: number; name: string; plan_id: string; plan_status: string; cycle: string; suspended: boolean; comped: boolean; created: number; sites: number; members: number; renews: number | null;
  owner: { name: string; email: string; last_login: number | null } | null }

export function StatusPill({ c }: { c: Pick<CustomerRow, "suspended" | "plan_status" | "comped"> }) {
  const [t, cls] = c.suspended ? ["Suspended", "bg-bad-soft text-bad"] : c.plan_status === "past_due" ? ["Past due", "bg-warn-soft text-warn"] : c.plan_status === "lapsed" ? ["Lapsed", "bg-bad-soft text-bad"] : c.comped ? ["Complimentary", "bg-brand-soft text-brand-ink"] : ["Active", "bg-ok-soft text-ok"];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{t}</span>;
}

export default function Customers() {
  const [q, setQ] = useState(""); const [plan, setPlan] = useState(""); const [status, setStatus] = useState(""); const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ q, plan, status, page: String(page) }).toString();
  const { data, error, mutate } = useSWR<{ total: number; customers: CustomerRow[] }>(`/api/admin/customers?${qs}`, fetcher);
  return (
    <>
      <PageHeader title="Customers" subtitle="Every workspace on the platform." />
      <div className="flex flex-wrap gap-3">
        <input aria-label="Search customers" placeholder="Search by company or owner email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className={`${input} max-w-sm`} />
        <select aria-label="Plan" value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }} className={`${input} !w-40`}><option value="">All plans</option>{["free", "starter", "growth", "scale"].map((p) => <option key={p} value={p}>{p}</option>)}</select>
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={`${input} !w-40`}><option value="">All statuses</option><option value="active">Active</option><option value="past_due">Past due</option><option value="lapsed">Lapsed</option><option value="suspended">Suspended</option></select>
      </div>
      {error ? <ErrorState message={error.message} retry={() => mutate()} /> : !data ? <Skeleton className="h-64" /> : (
        <Card className="overflow-x-auto">
          {data.customers.length === 0 ? <Empty title="No customers found" /> : (
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead><tr className="border-b border-line bg-soft text-xs uppercase tracking-wide text-muted"><th className="px-5 py-3">Workspace</th><th className="px-5 py-3">Owner</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Websites</th><th className="px-5 py-3">Team</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Joined</th></tr></thead>
              <tbody>{data.customers.map((c) => (
                <tr key={c.id} className="border-b border-line-soft last:border-0 hover:bg-soft">
                  <td className="px-5 py-3.5"><Link href={`/admin/customers/${c.id}`} className="font-semibold text-brand">{c.name}</Link></td>
                  <td className="px-5 py-3.5">{c.owner ? <><span className="block">{c.owner.name}</span><span className="text-muted">{c.owner.email}</span></> : "—"}</td>
                  <td className="px-5 py-3.5 capitalize">{c.plan_id}</td><td className="px-5 py-3.5 font-mono">{c.sites}</td><td className="px-5 py-3.5 font-mono">{c.members}</td>
                  <td className="px-5 py-3.5"><StatusPill c={c} /></td><td className="px-5 py-3.5 text-muted">{fmtAgo(c.created)}</td></tr>))}</tbody>
            </table>)}
          <div className="flex items-center justify-between px-5 py-3 text-sm text-muted"><span>{data.total} customer{data.total === 1 ? "" : "s"}</span>
            <span className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="min-h-10 px-3 font-semibold disabled:opacity-40">Previous</button>
              <button disabled={page * 25 >= data.total} onClick={() => setPage((p) => p + 1)} className="min-h-10 px-3 font-semibold disabled:opacity-40">Next</button></span></div>
        </Card>)}
    </>
  );
}
