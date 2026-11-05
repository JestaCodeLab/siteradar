"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, CardTitle, ErrorState, PageHeader, Skeleton, Tile } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { ghs } from "@/lib/me";

interface Overview { customers: number; paying: number; mrr: number; new30: number; sites: number; revenue30: number; past_due: number; signups: { d: string; n: number }[]; by_plan: Record<string, number> }

export default function AdminOverview() {
  const { data, error, mutate } = useSWR<Overview>("/api/admin/overview", fetcher, { refreshInterval: 60000 });
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-64" />;
  const max = Math.max(1, ...data.signups.map((s) => s.n));
  return (
    <>
      <PageHeader title="Platform overview" subtitle="How the business is doing." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Customers" value={data.customers} note={`${data.new30} new in 30 days`} tone="ok" />
        <Tile label="Paying customers" value={data.paying} note={data.customers ? `${Math.round((data.paying / data.customers) * 100)}% of all` : undefined} />
        <Tile label="Monthly recurring revenue" value={ghs(data.mrr)} />
        <Tile label="Collected, last 30 days" value={ghs(data.revenue30)} />
        <Tile label="Websites monitored" value={data.sites} />
        <Tile label="Payments past due" value={data.past_due} tone={data.past_due ? "warn" : "muted"} note={data.past_due ? "Follow up on Payments" : undefined} />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2"><CardTitle aside={`${data.new30} in the last 30 days`}>New customers per day</CardTitle>
          {data.signups.length === 0 ? <p className="py-8 text-center text-sm text-muted">No signups yet.</p> :
            <div className="flex h-32 items-end gap-1" role="img" aria-label="New customers per day">{data.signups.map((s) => <div key={s.d} title={`${s.d}: ${s.n}`} className="flex-1 rounded-t bg-brand" style={{ height: `${(s.n / max) * 100}%`, minHeight: 4 }} />)}</div>}
        </Card>
        <Card className="p-5"><CardTitle>Customers by plan</CardTitle>
          <ul className="flex flex-col gap-2">{Object.entries(data.by_plan).map(([k, n]) => <li key={k} className="flex justify-between text-sm"><span className="capitalize">{k}</span><span className="font-mono">{n}</span></li>)}</ul>
          <Link href="/admin/customers" className="mt-4 inline-block text-sm font-semibold text-brand">All customers</Link>
        </Card>
      </div>
    </>
  );
}
